-- ANIVIA — AniZip → own database: resumable background import + incremental sync.
-- Run after 0007 (uses app_secrets.cron_secret, pg_cron and pg_net). Safe to re-run.
--
-- How it runs (there is no always-on server: the site is Cloudflare static + Worker, the backend is Supabase):
--   pg_cron, every minute ─▶ Edge Function `anizip-sync` (x-cron-secret)
--     ─▶ anizip_tick_begin(): takes a lease on the active job (or creates the initial full sync / a daily incremental)
--     ─▶ seed phase: the AniDB↔AniList mapping list → anizip_sync_items (one row per title, idempotent)
--     ─▶ fetch phase: next pending items → api.ani.zip (rate limited, retries) → anizip_record_batch() upserts
--     ─▶ lease released; a crash simply lets the lease expire and the next tick continues where it stopped.
-- Progress lives in the tables below, so restarts/redeploys never lose it and finished titles are not fetched again.

-- ═══════════════════════════ Imported data ═══════════════════════════
create table if not exists public.anizip_anime (
  id             bigint generated always as identity primary key,
  anidb_id       int unique,
  anilist_id     int unique,
  mal_id         int,
  kitsu_id       int,
  animeplanet_id text,
  anisearch_id   int,
  livechart_id   int,
  notifymoe_id   text,
  tvdb_id        int,
  imdb_id        text,
  tmdb_id        text,
  type           text,
  titles         jsonb not null default '{}'::jsonb,
  images         jsonb not null default '[]'::jsonb,
  episode_count  int,
  special_count  int,
  source_hash    text not null,
  fetched_at     timestamptz not null default now(),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists anizip_anime_mal on public.anizip_anime (mal_id) where mal_id is not null;
create index if not exists anizip_anime_kitsu on public.anizip_anime (kitsu_id) where kitsu_id is not null;
create index if not exists anizip_anime_tvdb on public.anizip_anime (tvdb_id) where tvdb_id is not null;
alter table public.anizip_anime enable row level security;

create table if not exists public.anizip_episodes (
  anime_id                bigint not null references public.anizip_anime (id) on delete cascade,
  episode_key             text not null,          -- the key ani.zip uses: "1", "12", "S1", "C2"…
  kind                    text not null,          -- regular | special | credit | trailer | parody | other
  episode_number          numeric,
  absolute_episode_number int,
  season_number           int,
  titles                  jsonb not null default '{}'::jsonb,
  air_date                date,
  air_date_utc            timestamptz,
  runtime                 int,
  length                  int,
  overview                text,
  summary                 text,
  image                   text,
  anidb_eid               int,
  tvdb_episode_id         int,
  rating                  numeric,
  finale_type             text,
  updated_at              timestamptz not null default now(),
  primary key (anime_id, episode_key)
);
create index if not exists anizip_episodes_air on public.anizip_episodes (air_date_utc) where air_date_utc is not null;
create index if not exists anizip_episodes_anidb_eid on public.anizip_episodes (anidb_eid) where anidb_eid is not null;
alter table public.anizip_episodes enable row level security;

-- ═══════════════════════════ Sync state ═══════════════════════════
-- One row per title to fetch. key = "anidb:<id>" (preferred), "anilist:<id>" or "mal:<id>".
create table if not exists public.anizip_sync_items (
  key             text primary key,
  anidb_id        int,
  anilist_id      int,
  mal_id          int,
  status          text not null default 'pending' check (status in ('pending', 'done', 'skipped', 'failed')),
  attempts        int not null default 0,
  next_attempt_at timestamptz not null default now(),
  last_error      text,
  anime_id        bigint references public.anizip_anime (id) on delete set null,
  synced_at       timestamptz,
  created_at      timestamptz not null default now()
);
create index if not exists anizip_items_queue on public.anizip_sync_items (status, next_attempt_at, key);
create index if not exists anizip_items_anime on public.anizip_sync_items (anime_id) where anime_id is not null;
create index if not exists anizip_items_synced on public.anizip_sync_items (synced_at);
alter table public.anizip_sync_items enable row level security;

create table if not exists public.sync_jobs (
  id                 bigint generated always as identity primary key,
  job_type           text not null check (job_type in ('anizip_full', 'anizip_incremental')),
  status             text not null default 'PENDING' check (status in ('PENDING', 'RUNNING', 'PAUSED', 'COMPLETED', 'FAILED')),
  phase              text not null default 'seed' check (phase in ('seed', 'fetch')),
  cursor             text,                        -- last processed item key
  total              int not null default 0,
  processed          int not null default 0,
  imported           int not null default 0,      -- new titles
  updated            int not null default 0,      -- changed titles
  unchanged          int not null default 0,
  skipped            int not null default 0,      -- not on ani.zip / empty
  failed             int not null default 0,
  episodes_imported  bigint not null default 0,
  retry_count        int not null default 0,
  current_item       text,
  last_error         text,
  errors             jsonb not null default '[]'::jsonb,  -- last 50 errors
  rate_limited_until timestamptz,
  lease_owner        text,
  lease_until        timestamptz,
  created_at         timestamptz not null default now(),
  started_at         timestamptz,
  updated_at         timestamptz not null default now(),
  completed_at       timestamptz
);
-- At most one unfinished AniZip job at a time (concurrent-creation guard).
create unique index if not exists sync_jobs_one_active on public.sync_jobs ((left(job_type, 6))) where status in ('PENDING', 'RUNNING', 'PAUSED');
create index if not exists sync_jobs_recent on public.sync_jobs (job_type, created_at desc);
alter table public.sync_jobs enable row level security;

insert into public.feature_flags (key, enabled, description) values
  ('anizip_sync', true, 'Background AniZip import/sync into the ANIVIA database (Admin → Sync).')
on conflict (key) do nothing;

-- ═══════════════════════════ Worker functions (service role only) ═══════════════════════════
create or replace function public.anizip_push_error(p_errors jsonb, p_key text, p_message text)
returns jsonb language sql stable as $$
  -- Appends one error and keeps the newest 50 (oldest first).
  select coalesce(jsonb_agg(e order by n), '[]'::jsonb) from (
    select e, n from jsonb_array_elements(coalesce(p_errors, '[]'::jsonb) || jsonb_build_array(jsonb_build_object('key', p_key, 'error', left(coalesce(p_message, ''), 300), 'at', now())))
      with ordinality as x(e, n)
    order by n desc limit 50
  ) last50;
$$;

-- Takes the lease on the active job, or creates the next job when nothing is running.
-- Returns the job row (json) or null when there is nothing to do / another worker holds the lease.
create or replace function public.anizip_tick_begin(p_owner text, p_lease_seconds int default 120, p_incremental_hours int default 24)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_job public.sync_jobs;
  v_last_full public.sync_jobs;
  v_last_done timestamptz;
begin
  if exists (select 1 from feature_flags where key = 'anizip_sync' and not enabled) then return null; end if;

  select * into v_job from sync_jobs where job_type like 'anizip%' and status in ('PENDING', 'RUNNING', 'PAUSED') order by id desc limit 1;

  if not found then
    select * into v_last_full from sync_jobs where job_type = 'anizip_full' order by id desc limit 1;
    if not exists (select 1 from sync_jobs where job_type = 'anizip_full' and status = 'COMPLETED') then
      -- Initial full sync. After a FAILED one wait an hour before trying again.
      if v_last_full.id is not null and v_last_full.status = 'FAILED' and v_last_full.updated_at > now() - interval '1 hour' then return null; end if;
      insert into sync_jobs (job_type) values ('anizip_full') on conflict do nothing;
    else
      select max(completed_at) into v_last_done from sync_jobs where job_type like 'anizip%' and status = 'COMPLETED';
      if v_last_done > now() - make_interval(hours => p_incremental_hours) then return null; end if;
      insert into sync_jobs (job_type) values ('anizip_incremental') on conflict do nothing;
    end if;
    select * into v_job from sync_jobs where job_type like 'anizip%' and status in ('PENDING', 'RUNNING', 'PAUSED') order by id desc limit 1;
    if not found then return null; end if;
  end if;

  if v_job.status = 'PAUSED' then return null; end if;
  if v_job.rate_limited_until is not null and v_job.rate_limited_until > now() then return null; end if;

  update sync_jobs set
    status = 'RUNNING', lease_owner = p_owner, lease_until = now() + make_interval(secs => p_lease_seconds),
    started_at = coalesce(started_at, now()), updated_at = now()
  where id = v_job.id and status in ('PENDING', 'RUNNING') and (lease_until is null or lease_until < now() or lease_owner = p_owner)
  returning * into v_job;
  if not found then return null; end if; -- another worker holds the lease
  return row_to_json(v_job);
end;
$$;

create or replace function public.anizip_tick_end(p_job bigint, p_owner text)
returns void language sql security definer set search_path = public as $$
  update sync_jobs set lease_owner = null, lease_until = null, updated_at = now() where id = p_job and lease_owner = p_owner;
$$;

-- Seed phase: upserts a chunk of the mapping list. Existing items keep their status (done stays done).
create or replace function public.anizip_seed_items(p_job bigint, p_owner text, p_items jsonb)
returns int language plpgsql security definer set search_path = public as $$
declare v_count int;
begin
  if not exists (select 1 from sync_jobs where id = p_job and lease_owner = p_owner and status = 'RUNNING') then raise exception 'lease lost'; end if;
  with src as (
    select distinct on (x.key) x.key, x.anidb_id, x.anilist_id, x.mal_id
    from jsonb_to_recordset(p_items) as x(key text, anidb_id int, anilist_id int, mal_id int)
    where x.key is not null
  ), ins as (
    insert into anizip_sync_items (key, anidb_id, anilist_id, mal_id)
    select key, anidb_id, anilist_id, mal_id from src
    on conflict (key) do update set anidb_id = excluded.anidb_id, anilist_id = excluded.anilist_id, mal_id = excluded.mal_id
      where (anizip_sync_items.anidb_id, anizip_sync_items.anilist_id, anizip_sync_items.mal_id) is distinct from (excluded.anidb_id, excluded.anilist_id, excluded.mal_id)
    returning (xmax = 0) as inserted
  )
  select count(*) filter (where inserted) into v_count from ins;
  update sync_jobs set updated_at = now(), lease_until = greatest(lease_until, now() + interval '120 seconds') where id = p_job;
  return v_count;
end;
$$;

-- End of the seed phase. Incremental jobs re-queue titles that can change: airing/upcoming episodes,
-- titles without episode data yet, a slice of the oldest syncs, and old "not found" results.
create or replace function public.anizip_seed_finish(p_job bigint, p_owner text)
returns json language plpgsql security definer set search_path = public as $$
declare v_job public.sync_jobs;
begin
  select * into v_job from sync_jobs where id = p_job and lease_owner = p_owner and status = 'RUNNING' for update;
  if not found then raise exception 'lease lost'; end if;

  if v_job.job_type = 'anizip_incremental' then
    update anizip_sync_items i set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null
    where i.status in ('done', 'skipped') and (
      i.anime_id in (select distinct e.anime_id from anizip_episodes e where e.air_date_utc > now() - interval '21 days')
      or i.anime_id in (select a.id from anizip_anime a where coalesce(a.episode_count, 0) = 0 or not exists (select 1 from anizip_episodes e where e.anime_id = a.id))
      or i.key in (select key from anizip_sync_items where status = 'done' and synced_at < now() - interval '30 days' order by synced_at limit 2000)
      or (i.status = 'skipped' and i.synced_at < now() - interval '14 days')
    );
  end if;

  update sync_jobs set
    phase = 'fetch',
    total = case when job_type = 'anizip_full' then (select count(*) from anizip_sync_items) else (select count(*) from anizip_sync_items where status = 'pending') end,
    updated_at = now()
  where id = p_job
  returning * into v_job;
  return row_to_json(v_job);
end;
$$;

-- Next items to fetch. Completes the job when nothing is left (failed-after-retries items don't block it).
create or replace function public.anizip_next_items(p_job bigint, p_owner text, p_limit int default 20)
returns json language plpgsql security definer set search_path = public as $$
declare v_items json;
begin
  if not exists (select 1 from sync_jobs where id = p_job and lease_owner = p_owner and status = 'RUNNING') then
    return json_build_object('stop', true, 'items', '[]'::json);
  end if;
  select coalesce(json_agg(row_to_json(t)), '[]'::json) into v_items from (
    select key, anidb_id, anilist_id, mal_id, attempts from anizip_sync_items
    where status = 'pending' and next_attempt_at <= now()
    order by key limit greatest(1, least(p_limit, 200))
  ) t;
  if json_array_length(v_items) = 0 then
    if not exists (select 1 from anizip_sync_items where status = 'pending') then
      update sync_jobs set status = 'COMPLETED', completed_at = now(), current_item = null, lease_owner = null, lease_until = null, updated_at = now() where id = p_job;
      return json_build_object('stop', true, 'completed', true, 'items', '[]'::json);
    end if;
    return json_build_object('stop', true, 'waiting', true, 'items', '[]'::json); -- only items waiting for a retry slot
  end if;
  return json_build_object('stop', false, 'items', v_items);
end;
$$;

-- Records a batch of results: upserts titles + episodes (set-based), updates item states and job counters.
-- Result outcomes: ok (with "anime"), skipped, retry (transient error), failed (permanent error).
create or replace function public.anizip_record_batch(p_job bigint, p_owner text, p_results jsonb, p_max_attempts int default 6, p_rate_limited_seconds int default 0)
returns json language plpgsql security definer set search_path = public as $$
declare
  v_job public.sync_jobs;
  r jsonb;
  a jsonb;
  v_key text;
  v_id bigint;
  v_old_hash text;
  v_anidb int; v_al int; v_mal int;
  v_kind text;
  v_new_eps int;
  v_imported int := 0; v_updated int := 0; v_unchanged int := 0; v_skipped int := 0; v_failed int := 0; v_retries int := 0; v_eps bigint := 0;
  v_errors jsonb;
  v_current text;
  v_attempts int;
begin
  select * into v_job from sync_jobs where id = p_job for update;
  if not found then return json_build_object('stop', true, 'reason', 'no_job'); end if;
  -- Another worker took over: drop this batch (its items stay pending). A pause still keeps fetched data.
  if v_job.status = 'RUNNING' and v_job.lease_owner is distinct from p_owner then return json_build_object('stop', true, 'reason', 'lease_lost'); end if;
  v_errors := v_job.errors;

  for r in select value from jsonb_array_elements(p_results) loop
    v_key := r->>'key';
    case r->>'outcome'
    when 'ok' then
     begin
      a := r->'anime';
      v_new_eps := 0;
      v_anidb := nullif(a->>'anidb_id', '')::int;
      v_al := nullif(a->>'anilist_id', '')::int;
      v_mal := nullif(a->>'mal_id', '')::int;
      v_id := null; v_old_hash := null;
      -- Identity: AniDB id, then AniList id, then MAL id (only for rows without the stronger ids).
      if v_anidb is not null then select id, source_hash into v_id, v_old_hash from anizip_anime where anidb_id = v_anidb; end if;
      if v_id is null and v_al is not null then select id, source_hash into v_id, v_old_hash from anizip_anime where anilist_id = v_al; end if;
      if v_id is null and v_mal is not null and v_anidb is null and v_al is null then
        select id, source_hash into v_id, v_old_hash from anizip_anime where mal_id = v_mal and anidb_id is null and anilist_id is null limit 1;
      end if;

      if v_id is not null and v_old_hash = a->>'source_hash' then
        v_kind := 'unchanged';
        update anizip_anime set fetched_at = now() where id = v_id;
      else
        if v_al is not null then
          -- The same title imported earlier through its AniList id only → merge into this record.
          delete from anizip_anime where anilist_id = v_al and id is distinct from v_id and anidb_id is null and v_anidb is not null;
          update anizip_anime set anilist_id = null where anilist_id = v_al and id is distinct from v_id;
        end if;
        if v_id is null then
          insert into anizip_anime (anidb_id, anilist_id, mal_id, kitsu_id, animeplanet_id, anisearch_id, livechart_id, notifymoe_id, tvdb_id, imdb_id, tmdb_id, type, titles, images, episode_count, special_count, source_hash)
          values (v_anidb, v_al, v_mal, nullif(a->>'kitsu_id', '')::int, a->>'animeplanet_id', nullif(a->>'anisearch_id', '')::int, nullif(a->>'livechart_id', '')::int, a->>'notifymoe_id',
                  nullif(a->>'tvdb_id', '')::int, a->>'imdb_id', a->>'tmdb_id', a->>'type', coalesce(a->'titles', '{}'::jsonb), coalesce(a->'images', '[]'::jsonb),
                  nullif(a->>'episode_count', '')::int, nullif(a->>'special_count', '')::int, a->>'source_hash')
          returning id into v_id;
          v_kind := 'imported';
        else
          update anizip_anime set anidb_id = coalesce(v_anidb, anidb_id), anilist_id = coalesce(v_al, anilist_id), mal_id = coalesce(v_mal, mal_id), kitsu_id = nullif(a->>'kitsu_id', '')::int, animeplanet_id = a->>'animeplanet_id',
            anisearch_id = nullif(a->>'anisearch_id', '')::int, livechart_id = nullif(a->>'livechart_id', '')::int, notifymoe_id = a->>'notifymoe_id',
            tvdb_id = nullif(a->>'tvdb_id', '')::int, imdb_id = a->>'imdb_id', tmdb_id = a->>'tmdb_id', type = a->>'type',
            titles = coalesce(a->'titles', '{}'::jsonb), images = coalesce(a->'images', '[]'::jsonb),
            episode_count = nullif(a->>'episode_count', '')::int, special_count = nullif(a->>'special_count', '')::int,
            source_hash = a->>'source_hash', fetched_at = now(), updated_at = now()
          where id = v_id;
          v_kind := 'updated';
        end if;

        with up as (
          insert into anizip_episodes (anime_id, episode_key, kind, episode_number, absolute_episode_number, season_number, titles, air_date, air_date_utc,
                                       runtime, length, overview, summary, image, anidb_eid, tvdb_episode_id, rating, finale_type, updated_at)
          select v_id, e.episode_key, e.kind, e.episode_number, e.absolute_episode_number, e.season_number, coalesce(e.titles, '{}'::jsonb), e.air_date, e.air_date_utc,
                 e.runtime, e.length, e.overview, e.summary, e.image, e.anidb_eid, e.tvdb_episode_id, e.rating, e.finale_type, now()
          from jsonb_to_recordset(coalesce(a->'episodes', '[]'::jsonb)) as e(
            episode_key text, kind text, episode_number numeric, absolute_episode_number int, season_number int, titles jsonb, air_date date, air_date_utc timestamptz,
            runtime int, length int, overview text, summary text, image text, anidb_eid int, tvdb_episode_id int, rating numeric, finale_type text)
          where e.episode_key is not null
          on conflict (anime_id, episode_key) do update set
            kind = excluded.kind, episode_number = excluded.episode_number, absolute_episode_number = excluded.absolute_episode_number,
            season_number = excluded.season_number, titles = excluded.titles, air_date = excluded.air_date, air_date_utc = excluded.air_date_utc,
            runtime = excluded.runtime, length = excluded.length, overview = excluded.overview, summary = excluded.summary, image = excluded.image,
            anidb_eid = excluded.anidb_eid, tvdb_episode_id = excluded.tvdb_episode_id, rating = excluded.rating, finale_type = excluded.finale_type, updated_at = now()
          returning (xmax = 0) as inserted
        )
        select count(*) filter (where inserted) into v_new_eps from up;
        -- Episodes that disappeared from ani.zip.
        delete from anizip_episodes where anime_id = v_id
          and not (episode_key = any (array(select x->>'episode_key' from jsonb_array_elements(coalesce(a->'episodes', '[]'::jsonb)) x)));
      end if;

      update anizip_sync_items set status = 'done', attempts = 0, last_error = null, anime_id = v_id, synced_at = now() where key = v_key;
      if v_kind = 'imported' then v_imported := v_imported + 1; elsif v_kind = 'updated' then v_updated := v_updated + 1; else v_unchanged := v_unchanged + 1; end if;
      v_current := coalesce(a->'titles'->>'en', a->'titles'->>'x-jat', a->'titles'->>'ja', v_key);
      v_eps := v_eps + coalesce(v_new_eps, 0);
     exception when others then
      -- One bad record (e.g. a value Postgres rejects) must not stop the batch: everything for it is rolled back.
      update anizip_sync_items set status = 'failed', attempts = attempts + 1, last_error = left('db: ' || sqlerrm, 300), synced_at = now() where key = v_key;
      v_failed := v_failed + 1;
      v_errors := anizip_push_error(v_errors, v_key, 'db: ' || sqlerrm);
     end;

    when 'skipped' then
      update anizip_sync_items set status = 'skipped', attempts = 0, last_error = left(r->>'error', 300), synced_at = now() where key = v_key;
      v_skipped := v_skipped + 1;

    when 'retry' then
      update anizip_sync_items set attempts = attempts + 1, last_error = left(r->>'error', 300),
        status = case when attempts + 1 >= p_max_attempts then 'failed' else 'pending' end,
        next_attempt_at = now() + least(interval '6 hours', make_interval(mins => power(2, attempts + 1)::int))
      where key = v_key
      returning attempts into v_attempts;
      v_retries := v_retries + 1;
      if v_attempts >= p_max_attempts then v_failed := v_failed + 1; end if;
      v_errors := anizip_push_error(v_errors, v_key, r->>'error');

    else -- failed
      update anizip_sync_items set status = 'failed', attempts = attempts + 1, last_error = left(r->>'error', 300), synced_at = now() where key = v_key;
      v_failed := v_failed + 1;
      v_errors := anizip_push_error(v_errors, v_key, r->>'error');
    end case;
    v_job.cursor := v_key;
  end loop;

  update sync_jobs set
    processed = processed + v_imported + v_updated + v_unchanged + v_skipped + v_failed,
    imported = imported + v_imported, updated = updated + v_updated, unchanged = unchanged + v_unchanged,
    skipped = skipped + v_skipped, failed = failed + v_failed, retry_count = retry_count + v_retries,
    episodes_imported = episodes_imported + v_eps,
    errors = v_errors,
    last_error = coalesce((v_errors -> -1 ->> 'error'), last_error),
    current_item = coalesce(v_current, current_item),
    cursor = v_job.cursor,
    rate_limited_until = case when p_rate_limited_seconds > 0 then now() + make_interval(secs => p_rate_limited_seconds) else rate_limited_until end,
    lease_until = case when lease_owner = p_owner then greatest(lease_until, now() + interval '120 seconds') else lease_until end,
    updated_at = now()
  where id = p_job
  returning * into v_job;

  return json_build_object('stop', v_job.status <> 'RUNNING', 'status', v_job.status, 'processed', v_job.processed, 'total', v_job.total,
    'imported', v_imported, 'updated', v_updated, 'unchanged', v_unchanged, 'skipped', v_skipped, 'failed', v_failed, 'episodes', v_eps);
end;
$$;

-- Seed failure: retried on the next ticks, FAILED after 5 attempts.
create or replace function public.anizip_job_error(p_job bigint, p_owner text, p_message text, p_fatal_after int default 5)
returns void language sql security definer set search_path = public as $$
  update sync_jobs set
    retry_count = retry_count + 1,
    last_error = left(p_message, 500),
    errors = public.anizip_push_error(errors, 'job', p_message),
    status = case when retry_count + 1 >= p_fatal_after then 'FAILED' else status end,
    lease_owner = null, lease_until = null, updated_at = now()
  where id = p_job and lease_owner = p_owner;
$$;

do $$
declare f text;
begin
  foreach f in array array[
    'anizip_tick_begin(text, int, int)', 'anizip_tick_end(bigint, text)', 'anizip_seed_items(bigint, text, jsonb)', 'anizip_seed_finish(bigint, text)',
    'anizip_next_items(bigint, text, int)', 'anizip_record_batch(bigint, text, jsonb, int, int)', 'anizip_job_error(bigint, text, text, int)'
  ] loop
    execute format('revoke all on function public.%s from public, anon, authenticated', f);
    execute format('grant execute on function public.%s to service_role', f);
  end loop;
end $$;

-- ═══════════════════════════ Public read (the site uses this instead of calling ani.zip) ═══════════════════════════
-- AniList id → AniZip anime → episodes. Only the fields the site shows.
create or replace function public.anizip_for_anilist(p_anilist_id int)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'anilist_id', a.anilist_id, 'mal_id', a.mal_id, 'anidb_id', a.anidb_id, 'episode_count', a.episode_count, 'images', a.images,
    'episodes', coalesce((
      select json_agg(json_build_object('key', e.episode_key, 'titles', e.titles, 'overview', e.overview, 'summary', e.summary,
                                        'air_date', e.air_date, 'air_date_utc', e.air_date_utc, 'image', e.image, 'runtime', e.runtime, 'length', e.length)
                      order by e.episode_number nulls last, e.episode_key)
      from anizip_episodes e where e.anime_id = a.id and e.kind = 'regular'
    ), '[]'::json))
  from anizip_anime a where a.anilist_id = p_anilist_id;
$$;
grant execute on function public.anizip_for_anilist(int) to anon, authenticated;

-- ═══════════════════════════ Admin (existing permission system) ═══════════════════════════
create or replace function public.admin_anizip_sync_status()
returns json language plpgsql stable security definer set search_path = public as $$
declare v_job public.sync_jobs; v_full_done boolean; v_rate numeric; v_pending int; v_calls json; v_cron json;
begin
  if not public.has_permission('cache.manage') then raise exception 'Not allowed'; end if;
  -- Diagnostics: the worker's last HTTP answers (pg_net) and the scheduler's last runs (pg_cron). Best effort.
  begin
    execute $q$select coalesce(json_agg(x), '[]'::json) from (
      select created, status_code, left(coalesce(content::text, ''), 300) as content, error_msg from net._http_response
      where content::text like '%anizip-sync%' or content::text like '%Requested function was not found%' or (error_msg is not null and created > now() - interval '1 hour')
      order by created desc limit 5) x$q$ into v_calls;
  exception when others then v_calls := null;
  end;
  begin
    execute $q$select coalesce(json_agg(x), '[]'::json) from (
      select d.start_time, d.status, left(coalesce(d.return_message, ''), 200) as message from cron.job_run_details d join cron.job j on j.jobid = d.jobid
      where j.jobname = 'anivia-anizip-sync' order by d.start_time desc limit 3) x$q$ into v_cron;
  exception when others then v_cron := null;
  end;
  select * into v_job from sync_jobs where job_type like 'anizip%' order by id desc limit 1;
  select exists (select 1 from sync_jobs where job_type = 'anizip_full' and status = 'COMPLETED') into v_full_done;
  select count(*) into v_pending from anizip_sync_items where status = 'pending';
  select count(*) / 15.0 into v_rate from anizip_sync_items where synced_at > now() - interval '15 minutes';
  return json_build_object(
    'job', case when v_job.id is null then null else row_to_json(v_job) end,
    'worker_active', coalesce(v_job.lease_until > now(), false),
    'initial_sync_completed', v_full_done,
    'enabled', coalesce((select enabled from feature_flags where key = 'anizip_sync'), true),
    'items', json_build_object(
      'total', (select count(*) from anizip_sync_items),
      'pending', v_pending,
      'done', (select count(*) from anizip_sync_items where status = 'done'),
      'skipped', (select count(*) from anizip_sync_items where status = 'skipped'),
      'failed', (select count(*) from anizip_sync_items where status = 'failed')),
    'anime', (select count(*) from anizip_anime),
    'episodes', (select count(*) from anizip_episodes),
    'per_minute', round(v_rate, 1),
    'eta_minutes', case when v_rate > 0 and v_pending > 0 then ceil(v_pending / v_rate) else null end,
    'worker_calls', v_calls,
    'cron_runs', v_cron,
    'schedule_exists', (select to_regclass('cron.job') is not null),
    'failed_items', coalesce((select json_agg(f) from (select key, attempts, last_error, synced_at from anizip_sync_items where status = 'failed' order by synced_at desc nulls last limit 20) f), '[]'::json)
  );
end;
$$;

-- start (full: imports everything not imported yet) | incremental | pause | resume | retry (failed → queue again)
create or replace function public.admin_anizip_sync_action(p_action text)
returns json language plpgsql security definer set search_path = public as $$
declare v_active public.sync_jobs; v_secret text;
begin
  if not public.has_permission('cache.manage') then raise exception 'Not allowed'; end if;
  select * into v_active from sync_jobs where job_type like 'anizip%' and status in ('PENDING', 'RUNNING', 'PAUSED') order by id desc limit 1;

  if p_action in ('start', 'incremental') then
    if v_active.id is not null then raise exception 'A sync is already in progress (%).', v_active.status; end if;
    insert into sync_jobs (job_type) values (case when p_action = 'start' then 'anizip_full' else 'anizip_incremental' end);
  elsif p_action = 'pause' then
    if v_active.id is null then raise exception 'Nothing to pause.'; end if;
    update sync_jobs set status = 'PAUSED', lease_owner = null, lease_until = null, updated_at = now() where id = v_active.id;
  elsif p_action = 'resume' then
    if v_active.id is null or v_active.status <> 'PAUSED' then raise exception 'Nothing to resume.'; end if;
    update sync_jobs set status = 'PENDING', rate_limited_until = null, updated_at = now() where id = v_active.id;
  elsif p_action = 'retry' then
    update anizip_sync_items set status = 'pending', attempts = 0, next_attempt_at = now(), last_error = null where status = 'failed';
    if v_active.id is null then
      insert into sync_jobs (job_type, phase) values ('anizip_incremental', 'fetch');
      update sync_jobs set total = (select count(*) from anizip_sync_items where status = 'pending') where job_type like 'anizip%' and status = 'PENDING';
    elsif v_active.status = 'PAUSED' then
      update sync_jobs set status = 'PENDING', updated_at = now() where id = v_active.id;
    end if;
  else
    raise exception 'Unknown action %', p_action;
  end if;

  -- Wake the worker now instead of waiting for the next minute (best effort).
  if p_action <> 'pause' then
    begin
      select value into v_secret from app_secrets where name = 'cron_secret';
      execute 'select net.http_post(url := $1, headers := $2, body := ''{}''::jsonb)'
        using 'https://wnmvktajokjhufuzpamy.supabase.co/functions/v1/anizip-sync', jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', v_secret);
    exception when others then null;
    end;
  end if;
  return public.admin_anizip_sync_status();
end;
$$;
grant execute on function public.admin_anizip_sync_status() to authenticated;
grant execute on function public.admin_anizip_sync_action(text) to authenticated;

-- ═══════════════════════════ Schedule (every minute) ═══════════════════════════
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') and exists (select 1 from pg_available_extensions where name = 'pg_net') then
    execute 'create extension if not exists pg_cron with schema pg_catalog';
    execute 'create extension if not exists pg_net with schema extensions';
    execute $cron$
      select cron.schedule('anivia-anizip-sync', '* * * * *', $job$
        select net.http_post(
          url := 'https://wnmvktajokjhufuzpamy.supabase.co/functions/v1/anizip-sync',
          headers := jsonb_build_object('Content-Type', 'application/json', 'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')),
          body := '{}'::jsonb,
          timeout_milliseconds := 5000
        );
      $job$)
    $cron$;
  end if;
end $$;
