-- ANIVIA — roles & permissions, feature flags, analytics, anime cache, AniList account links, admin tools
-- Run after 0001 and 0002 (SQL Editor → paste → Run, or `npm run db:migrate`). Safe to re-run.

-- ═══════════════════════════ Roles & permissions ═══════════════════════════
create table if not exists public.user_roles (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  role       text not null default 'user' check (role in ('user', 'moderator', 'admin')),
  granted_at timestamptz not null default now(),
  granted_by uuid references auth.users (id) on delete set null
);

create table if not exists public.role_permissions (
  role       text not null check (role in ('user', 'moderator', 'admin')),
  permission text not null,
  primary key (role, permission)
);

insert into public.role_permissions (role, permission) values
  ('admin', 'admin.access'), ('admin', 'analytics.view'), ('admin', 'flags.manage'), ('admin', 'users.manage'),
  ('admin', 'reports.manage'), ('admin', 'cache.manage'),
  ('moderator', 'admin.access'), ('moderator', 'analytics.view'), ('moderator', 'reports.manage')
on conflict do nothing;

alter table public.user_roles enable row level security;
alter table public.role_permissions enable row level security;

create or replace function public.has_permission(p_permission text)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.user_roles ur
    join public.role_permissions rp on rp.role = ur.role
    where ur.user_id = auth.uid() and rp.permission = p_permission
  );
$$;
grant execute on function public.has_permission(text) to anon, authenticated;

create or replace function public.my_access()
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'role', coalesce((select role from public.user_roles where user_id = auth.uid()), 'user'),
    'permissions', coalesce((select array_agg(rp.permission order by rp.permission) from public.user_roles ur join public.role_permissions rp on rp.role = ur.role where ur.user_id = auth.uid()), '{}')
  );
$$;
grant execute on function public.my_access() to authenticated;

drop policy if exists "roles: read own" on public.user_roles;
create policy "roles: read own" on public.user_roles for select using (user_id = auth.uid() or public.has_permission('users.manage'));
drop policy if exists "role_permissions: read" on public.role_permissions;
create policy "role_permissions: read" on public.role_permissions for select using (true);

-- ═══════════════════════════ Feature flags ═══════════════════════════
create table if not exists public.feature_flags (
  key         text primary key check (key ~ '^[a-z0-9_]{2,48}$'),
  enabled     boolean not null default false,
  description text not null default '',
  rollout     int not null default 100 check (rollout between 0 and 100),
  audience    text not null default 'all' check (audience in ('all', 'signed_in', 'staff')),
  payload     jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references auth.users (id) on delete set null
);
alter table public.feature_flags enable row level security;
drop policy if exists "flags: read" on public.feature_flags;
create policy "flags: read" on public.feature_flags for select using (true);
drop policy if exists "flags: manage" on public.feature_flags;
create policy "flags: manage" on public.feature_flags for all using (public.has_permission('flags.manage')) with check (public.has_permission('flags.manage'));

insert into public.feature_flags (key, enabled, description, payload) values
  ('maintenance_mode', false, 'Show a maintenance screen to everyone except staff.', '{"message": "We’ll be right back — ANIVIA is being upgraded."}'),
  ('announcement_banner', false, 'Banner at the top of every page.', '{"text": "", "link": ""}'),
  ('registration', true, 'Allow new accounts (email sign-up).', '{}'),
  ('anilist_login', true, 'Sign in / connect with AniList.', '{}'),
  ('anilist_sync', true, 'Two-way AniList list sync.', '{}'),
  ('public_profiles', true, 'Public profile pages (/u/username).', '{}'),
  ('contact_form', true, 'Contact form and issue reports.', '{}'),
  ('trailers', true, 'Official YouTube trailers.', '{}'),
  ('notifications', true, 'Notification bell.', '{}'),
  ('analytics', true, 'Anonymous usage statistics (with visitor consent).', '{}'),
  ('view_counts', true, 'Show “views this week” on anime pages.', '{}')
on conflict (key) do nothing;

drop trigger if exists feature_flags_touch on public.feature_flags;
create trigger feature_flags_touch before update on public.feature_flags for each row execute function public.touch_updated_at();

-- ═══════════════════════════ Analytics ═══════════════════════════
create table if not exists public.analytics_sessions (
  id           uuid primary key,
  visitor_id   uuid not null,
  user_id      uuid references auth.users (id) on delete set null,
  started_at   timestamptz not null default now(),
  last_seen    timestamptz not null default now(),
  landing_path text,
  referrer     text,
  device       text check (device in ('mobile', 'tablet', 'desktop')),
  language     text,
  user_agent   text
);
create index if not exists analytics_sessions_last_seen on public.analytics_sessions (last_seen desc);
create index if not exists analytics_sessions_started on public.analytics_sessions (started_at desc);

create table if not exists public.page_views (
  id          bigint generated always as identity primary key,
  session_id  uuid not null references public.analytics_sessions (id) on delete cascade,
  user_id     uuid references auth.users (id) on delete set null,
  path        text not null,
  anime_id    text,
  title       text,
  entered_at  timestamptz not null default now(),
  duration_ms int not null default 0
);
create index if not exists page_views_entered on public.page_views (entered_at desc);
create index if not exists page_views_session on public.page_views (session_id);
create index if not exists page_views_anime on public.page_views (anime_id, entered_at desc) where anime_id is not null;

alter table public.analytics_sessions enable row level security;
alter table public.page_views enable row level security;
-- No direct table access: everything goes through the functions below.

create or replace function public.analytics_enabled()
returns boolean language sql stable security definer set search_path = public as $$
  select coalesce((select enabled from public.feature_flags where key = 'analytics'), true);
$$;

create or replace function public.track_session(p_session uuid, p_visitor uuid, p_path text, p_referrer text, p_device text, p_language text, p_user_agent text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.analytics_enabled() then return; end if;
  insert into public.analytics_sessions (id, visitor_id, user_id, landing_path, referrer, device, language, user_agent)
  values (p_session, p_visitor, auth.uid(), left(p_path, 300), left(p_referrer, 300),
          case when p_device in ('mobile', 'tablet', 'desktop') then p_device end, left(p_language, 16), left(p_user_agent, 300))
  on conflict (id) do update set last_seen = now(), user_id = coalesce(public.analytics_sessions.user_id, auth.uid());
end;
$$;

create or replace function public.track_pageview(p_session uuid, p_path text, p_anime text default null, p_title text default null)
returns bigint language plpgsql security definer set search_path = public as $$
declare v_id bigint;
begin
  if not public.analytics_enabled() then return null; end if;
  update public.analytics_sessions set last_seen = now(), user_id = coalesce(user_id, auth.uid()) where id = p_session;
  if not found then return null; end if;
  -- Abuse guard: a single session can't record more than 2000 views.
  if (select count(*) from public.page_views where session_id = p_session) >= 2000 then return null; end if;
  insert into public.page_views (session_id, user_id, path, anime_id, title)
  values (p_session, auth.uid(), left(p_path, 300), left(p_anime, 40), left(p_title, 200))
  returning id into v_id;
  return v_id;
end;
$$;

create or replace function public.track_duration(p_view bigint, p_session uuid, p_ms int)
returns void language sql security definer set search_path = public as $$
  update public.page_views set duration_ms = greatest(duration_ms, least(greatest(p_ms, 0), 6 * 3600 * 1000))
  where id = p_view and session_id = p_session;
  update public.analytics_sessions set last_seen = now() where id = p_session;
$$;

create or replace function public.track_heartbeat(p_session uuid)
returns void language sql security definer set search_path = public as $$
  update public.analytics_sessions set last_seen = now() where id = p_session;
$$;

grant execute on function public.track_session(uuid, uuid, text, text, text, text, text) to anon, authenticated;
grant execute on function public.track_pageview(uuid, text, text, text) to anon, authenticated;
grant execute on function public.track_duration(bigint, uuid, int) to anon, authenticated;
grant execute on function public.track_heartbeat(uuid) to anon, authenticated;

-- Public: how many people viewed an anime recently (no personal data).
create or replace function public.anime_views(p_anime text, p_days int default 7)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'views', count(*),
    'viewers', count(distinct s.visitor_id),
    'watching_now', count(distinct s.visitor_id) filter (where s.last_seen > now() - interval '5 minutes' and v.entered_at > now() - interval '30 minutes')
  )
  from public.page_views v join public.analytics_sessions s on s.id = v.session_id
  where v.anime_id = p_anime and v.entered_at > now() - make_interval(days => least(greatest(p_days, 1), 90));
$$;
grant execute on function public.anime_views(text, int) to anon, authenticated;

-- Staff dashboard.
create or replace function public.analytics_overview(p_days int default 14)
returns json language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => least(greatest(p_days, 1), 365));
  today timestamptz := date_trunc('day', now());
begin
  if not public.has_permission('analytics.view') then raise exception 'Not allowed'; end if;
  return json_build_object(
    'online_now', (select count(distinct visitor_id) from analytics_sessions where last_seen > now() - interval '5 minutes'),
    'visitors_today', (select count(distinct visitor_id) from analytics_sessions where last_seen >= today),
    'pageviews_today', (select count(*) from page_views where entered_at >= today),
    'visitors_period', (select count(distinct visitor_id) from analytics_sessions where last_seen >= since),
    'pageviews_period', (select count(*) from page_views where entered_at >= since),
    'avg_session_seconds', (select coalesce(round(avg(extract(epoch from last_seen - started_at))), 0) from analytics_sessions where started_at >= since),
    'avg_time_on_page_seconds', (select coalesce(round(avg(duration_ms) / 1000.0), 0) from page_views where entered_at >= since and duration_ms > 0),
    'signed_in_share', (select coalesce(round(100.0 * count(*) filter (where user_id is not null) / nullif(count(*), 0)), 0) from analytics_sessions where started_at >= since),
    'total_users', (select count(*) from auth.users),
    'new_users_period', (select count(*) from auth.users where created_at >= since),
    'daily', (select coalesce(json_agg(d order by d.day), '[]') from (
        select to_char(g.day, 'YYYY-MM-DD') as day,
               (select count(distinct s.visitor_id) from analytics_sessions s where s.last_seen >= g.day and s.started_at < g.day + interval '1 day') as visitors,
               (select count(*) from page_views v where v.entered_at >= g.day and v.entered_at < g.day + interval '1 day') as pageviews
        from generate_series(date_trunc('day', since), today, interval '1 day') as g(day)) d),
    'top_pages', (select coalesce(json_agg(t), '[]') from (
        select path, count(*) as views, round(avg(nullif(duration_ms, 0)) / 1000.0) as avg_seconds
        from page_views where entered_at >= since group by path order by views desc limit 15) t),
    'top_anime', (select coalesce(json_agg(t), '[]') from (
        select v.anime_id, max(v.title) as title, count(*) as views, count(distinct s.visitor_id) as viewers
        from page_views v join analytics_sessions s on s.id = v.session_id
        where v.entered_at >= since and v.anime_id is not null group by v.anime_id order by views desc limit 15) t),
    'devices', (select coalesce(json_agg(t), '[]') from (
        select coalesce(device, 'unknown') as device, count(*) as sessions from analytics_sessions where started_at >= since group by 1 order by 2 desc) t),
    'referrers', (select coalesce(json_agg(t), '[]') from (
        select coalesce(nullif(split_part(split_part(referrer, '://', 2), '/', 1), ''), 'direct') as source, count(*) as sessions
        from analytics_sessions where started_at >= since group by 1 order by 2 desc limit 10) t)
  );
end;
$$;
grant execute on function public.analytics_overview(int) to authenticated;

-- Retention helper (schedule it with pg_cron or run it manually).
create or replace function public.analytics_cleanup(p_keep_days int default 180)
returns void language sql security definer set search_path = public as $$
  delete from public.analytics_sessions where last_seen < now() - make_interval(days => p_keep_days);
$$;

-- ═══════════════════════════ Anime data in the database ═══════════════════════════
-- Raw AniList responses cached by the `anilist-proxy` Edge Function (service role only).
create table if not exists public.api_cache (
  key        text primary key,
  body       jsonb not null,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null
);
create index if not exists api_cache_expires on public.api_cache (expires_at);
alter table public.api_cache enable row level security;

-- Every title seen through the proxy, normalised for reporting/search (public read).
create table if not exists public.anime_catalog (
  id          text primary key,
  source      text not null default 'anilist',
  title       text not null,
  title_romaji text,
  cover_url   text,
  status      text,
  format      text,
  season_year int,
  average_score int,
  popularity  int,
  genres      text[] not null default '{}',
  data        jsonb not null,
  updated_at  timestamptz not null default now()
);
create index if not exists anime_catalog_title on public.anime_catalog using gin (to_tsvector('simple', title || ' ' || coalesce(title_romaji, '')));
alter table public.anime_catalog enable row level security;
drop policy if exists "catalog: read" on public.anime_catalog;
create policy "catalog: read" on public.anime_catalog for select using (true);

create or replace function public.admin_cache_stats()
returns json language plpgsql stable security definer set search_path = public as $$
begin
  if not public.has_permission('cache.manage') then raise exception 'Not allowed'; end if;
  return json_build_object(
    'cached_responses', (select count(*) from api_cache where expires_at > now()),
    'expired_responses', (select count(*) from api_cache where expires_at <= now()),
    'catalog_titles', (select count(*) from anime_catalog),
    'catalog_updated', (select max(updated_at) from anime_catalog)
  );
end;
$$;
create or replace function public.admin_clear_cache()
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('cache.manage') then raise exception 'Not allowed'; end if;
  delete from api_cache;
end;
$$;
grant execute on function public.admin_cache_stats() to authenticated;
grant execute on function public.admin_clear_cache() to authenticated;

-- ═══════════════════════════ AniList account links ═══════════════════════════
-- One AniList account per ANIVIA account. Rows are created only by the `anilist-auth`
-- Edge Function after it verified the AniList token, so nobody can claim someone else's AniList.
create table if not exists public.anilist_links (
  user_id      uuid primary key references auth.users (id) on delete cascade,
  anilist_id   int not null unique,
  anilist_name text not null,
  avatar_url   text,
  site_url     text,
  access_token text not null,
  expires_at   timestamptz not null,
  linked_at    timestamptz not null default now()
);
alter table public.anilist_links enable row level security;
drop policy if exists "anilist: read own" on public.anilist_links;
create policy "anilist: read own" on public.anilist_links for select using (user_id = auth.uid());
drop policy if exists "anilist: unlink own" on public.anilist_links;
create policy "anilist: unlink own" on public.anilist_links for delete using (user_id = auth.uid());

alter table public.profiles add column if not exists avatar_url text;

-- ═══════════════════════════ Staff tools ═══════════════════════════
create or replace function public.admin_list_users(p_search text default '', p_limit int default 50, p_offset int default 0)
returns json language plpgsql stable security definer set search_path = public, auth as $$
begin
  if not public.has_permission('users.manage') then raise exception 'Not allowed'; end if;
  return (select coalesce(json_agg(t), '[]') from (
    select u.id, u.email, u.created_at, u.last_sign_in_at,
           coalesce(r.role, 'user') as role, p.display_name, p.username,
           (l.anilist_name) as anilist_name
    from auth.users u
    left join public.user_roles r on r.user_id = u.id
    left join public.profiles p on p.id = u.id
    left join public.anilist_links l on l.user_id = u.id
    where p_search = '' or u.email ilike '%' || p_search || '%' or p.display_name ilike '%' || p_search || '%' or p.username ilike '%' || p_search || '%'
    order by u.created_at desc
    limit least(greatest(p_limit, 1), 200) offset greatest(p_offset, 0)) t);
end;
$$;

create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_permission('users.manage') then raise exception 'Not allowed'; end if;
  if p_role not in ('user', 'moderator', 'admin') then raise exception 'Invalid role'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'You cannot remove your own admin role'; end if;
  insert into public.user_roles (user_id, role, granted_by) values (p_user, p_role, auth.uid())
  on conflict (user_id) do update set role = excluded.role, granted_by = auth.uid(), granted_at = now();
end;
$$;
grant execute on function public.admin_list_users(text, int, int) to authenticated;
grant execute on function public.admin_set_role(uuid, text) to authenticated;

-- Staff can read and triage the inbox.
drop policy if exists "contact: staff read" on public.contact_messages;
create policy "contact: staff read" on public.contact_messages for select using (public.has_permission('reports.manage'));
drop policy if exists "contact: staff update" on public.contact_messages;
create policy "contact: staff update" on public.contact_messages for update using (public.has_permission('reports.manage'));
drop policy if exists "reports: staff read" on public.reports;
create policy "reports: staff read" on public.reports for select using (public.has_permission('reports.manage'));
drop policy if exists "reports: staff update" on public.reports;
create policy "reports: staff update" on public.reports for update using (public.has_permission('reports.manage'));

-- ─── Make yourself admin (run once, with your email): ───────────────────────
-- insert into public.user_roles (user_id, role)
--   select id, 'admin' from auth.users where email = 'you@example.com'
--   on conflict (user_id) do update set role = 'admin';

create or replace function public.track_pageview_title(p_view bigint, p_session uuid, p_title text)
returns void language sql security definer set search_path = public as $$
  update public.page_views set title = left(p_title, 200) where id = p_view and session_id = p_session and anime_id is not null;
$$;
grant execute on function public.track_pageview_title(bigint, uuid, text) to anon, authenticated;
