-- =====================================================================================
-- ANIVIA — EGYBEN FRISSÍTÉS (0004 + 0005 + 0006 + 0007)  /  ALL-IN-ONE UPDATE
--
-- Supabase AI: please run this whole script exactly as it is, in the SQL editor, top to bottom.
--  * Every part is safe to run again (if not exists / or replace / drop ... if exists / on conflict).
--  * Do NOT change table, column, function or policy names — the website depends on them.
--  * Do NOT print or reveal any values from public.app_secrets.
--  * If it fails because pg_cron or pg_net is not available: enable both extensions
--    (Database → Extensions), then run the script again.
--  * At the end, show the result of the final check query and tell the user in Hungarian
--    whether everything is OK.
--
-- Kézzel is futtatható: SQL Editor → New query → beillesztés → Run.
-- =====================================================================================


-- ───────────── 0004_anivia_oauth_flags.sql ─────────────
-- ANIVIA — feature flags for the social sign-in buttons (Google / Discord / GitHub).
-- The buttons stay hidden until you enable the provider in Supabase → Authentication → Providers
-- AND switch its flag on in Admin → Feature flags. Safe to re-run.
insert into public.feature_flags (key, enabled, description) values
  ('oauth_google', false, 'Show “Continue with Google” (enable the Google provider in Supabase first).'),
  ('oauth_discord', false, 'Show “Continue with Discord” (enable the Discord provider in Supabase first).'),
  ('oauth_github', false, 'Show “Continue with GitHub” (enable the GitHub provider in Supabase first).')
on conflict (key) do nothing;

-- ───────────── 0005_anivia_profile_images.sql ─────────────
-- ANIVIA — profile picture (anime character) and profile banner (anime banner). Safe to re-run.
alter table public.profiles add column if not exists avatar_url text;
alter table public.profiles add column if not exists banner_url text;

-- Only artwork from the anime databases may be shown on (public) profiles — no arbitrary links.
alter table public.profiles drop constraint if exists profiles_avatar_url_allowed;
alter table public.profiles add constraint profiles_avatar_url_allowed check (
  avatar_url is null or (char_length(avatar_url) <= 500 and avatar_url ~ '^https://(s4\.anilist\.co|img\.anili\.st|cdn\.myanimelist\.net|artworks\.thetvdb\.com)/')
) not valid;
alter table public.profiles drop constraint if exists profiles_banner_url_allowed;
alter table public.profiles add constraint profiles_banner_url_allowed check (
  banner_url is null or (char_length(banner_url) <= 500 and banner_url ~ '^https://(s4\.anilist\.co|img\.anili\.st|cdn\.myanimelist\.net|artworks\.thetvdb\.com)/')
) not valid;

-- Public profile pages show the picture and banner too.
create or replace function public.public_profile(p_username text)
returns json
language sql
stable
security definer
set search_path = public
as $$
  select json_build_object(
    'profile', json_build_object(
      'id', p.id, 'username', p.username, 'display_name', p.display_name, 'bio', p.bio,
      'avatar_hue', p.avatar_hue, 'avatar_url', p.avatar_url, 'banner_url', p.banner_url,
      'created_at', p.created_at, 'show_history', p.show_history
    ),
    'watchlist', coalesce(l.watchlist, '[]'::jsonb),
    'favorites', coalesce(l.favorites, '[]'::jsonb),
    'ratings', coalesce(l.ratings, '{}'::jsonb),
    'history', case when p.show_history then coalesce(l.history, '[]'::jsonb) else '[]'::jsonb end
  )
  from public.profiles p
  left join public.user_library l on l.user_id = p.id
  where lower(p.username) = lower(p_username) and p.is_public
  limit 1;
$$;
grant execute on function public.public_profile(text) to anon, authenticated;

-- ───────────── 0006_anivia_community.sql ─────────────
-- ANIVIA — community: follows & activity feed, reviews, comments, custom lists, community score,
-- client error log and web-push subscriptions. Run after 0001–0005. Safe to re-run.

-- ═══════════════════════════ Helpers ═══════════════════════════
-- Public author card for anything people post (only what a public profile would show anyway).
create or replace function public.author_card(p_user uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'id', p.id,
    'username', case when p.is_public then p.username end,
    'display_name', p.display_name,
    'avatar_hue', p.avatar_hue,
    'avatar_url', p.avatar_url
  ) from public.profiles p where p.id = p_user;
$$;

-- ═══════════════════════════ Community score ═══════════════════════════
create or replace function public.anime_community_score(p_anime text)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('average', round(avg((l.ratings ->> p_anime)::numeric), 1), 'count', count(*))
  from public.user_library l
  where l.ratings ? p_anime and (l.ratings ->> p_anime) ~ '^[0-9]+(\.[0-9]+)?$';
$$;
grant execute on function public.anime_community_score(text) to anon, authenticated;

-- ═══════════════════════════ Follows ═══════════════════════════
create table if not exists public.follows (
  follower   uuid not null references auth.users (id) on delete cascade,
  followee   uuid not null references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower, followee),
  check (follower <> followee)
);
create index if not exists follows_followee on public.follows (followee);
alter table public.follows enable row level security;
drop policy if exists "follows: read own" on public.follows;
create policy "follows: read own" on public.follows for select using (follower = auth.uid() or followee = auth.uid());
drop policy if exists "follows: follow" on public.follows;
create policy "follows: follow" on public.follows for insert with check (
  follower = auth.uid() and exists (select 1 from public.profiles p where p.id = followee and p.is_public)
);
drop policy if exists "follows: unfollow" on public.follows;
create policy "follows: unfollow" on public.follows for delete using (follower = auth.uid());

create or replace function public.follow_stats(p_user uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object(
    'followers', (select count(*) from public.follows where followee = p_user),
    'following', (select count(*) from public.follows where follower = p_user),
    'is_following', exists (select 1 from public.follows where follower = auth.uid() and followee = p_user)
  );
$$;
grant execute on function public.follow_stats(uuid) to anon, authenticated;

-- ═══════════════════════════ Activity feed ═══════════════════════════
create table if not exists public.activities (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  kind       text not null check (kind in ('status', 'rating', 'episode', 'review', 'list', 'favorite')),
  anime_id   text check (char_length(anime_id) <= 40),
  data       jsonb not null default '{}'::jsonb check (pg_column_size(data) < 2000),
  created_at timestamptz not null default now()
);
create index if not exists activities_user on public.activities (user_id, created_at desc);
alter table public.activities enable row level security;
drop policy if exists "activities: insert own" on public.activities;
create policy "activities: insert own" on public.activities for insert with check (user_id = auth.uid());
drop policy if exists "activities: read own" on public.activities;
create policy "activities: read own" on public.activities for select using (user_id = auth.uid());
drop policy if exists "activities: delete own" on public.activities;
create policy "activities: delete own" on public.activities for delete using (user_id = auth.uid());

-- Flood guard: at most 300 activities per user per hour; repeated identical events collapse.
create or replace function public.activities_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.activities where user_id = new.user_id and created_at > now() - interval '1 hour') >= 300 then
    return null;
  end if;
  delete from public.activities
   where user_id = new.user_id and kind = new.kind and anime_id is not distinct from new.anime_id and created_at > now() - interval '10 minutes';
  return new;
end;
$$;
drop trigger if exists activities_guard on public.activities;
create trigger activities_guard before insert on public.activities for each row execute function public.activities_guard();

-- Feed: activity of people you follow (public profiles only), newest first.
create or replace function public.activity_feed(p_before timestamptz default now(), p_limit int default 40)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]') from (
    select a.id, a.kind, a.anime_id, a.data, a.created_at, public.author_card(a.user_id) as author
    from public.activities a
    join public.follows f on f.followee = a.user_id and f.follower = auth.uid()
    join public.profiles p on p.id = a.user_id and p.is_public
    where a.created_at < p_before
    order by a.created_at desc
    limit least(greatest(p_limit, 1), 100)
  ) t;
$$;
grant execute on function public.activity_feed(timestamptz, int) to authenticated;

-- A public profile's own recent activity.
create or replace function public.profile_activity(p_user uuid, p_limit int default 20)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]') from (
    select a.id, a.kind, a.anime_id, a.data, a.created_at
    from public.activities a join public.profiles p on p.id = a.user_id
    where a.user_id = p_user and (p.is_public or a.user_id = auth.uid())
    order by a.created_at desc limit least(greatest(p_limit, 1), 50)
  ) t;
$$;
grant execute on function public.profile_activity(uuid, int) to anon, authenticated;

-- ═══════════════════════════ Reviews ═══════════════════════════
create table if not exists public.reviews (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  anime_id   text not null check (char_length(anime_id) <= 40),
  score      int check (score between 1 and 10),
  body       text not null check (char_length(body) between 20 and 5000),
  spoiler    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, anime_id)
);
create index if not exists reviews_anime on public.reviews (anime_id, created_at desc);
alter table public.reviews enable row level security;
drop policy if exists "reviews: read" on public.reviews;
create policy "reviews: read" on public.reviews for select using (true);
drop policy if exists "reviews: write own" on public.reviews;
create policy "reviews: write own" on public.reviews for insert with check (user_id = auth.uid());
drop policy if exists "reviews: update own" on public.reviews;
create policy "reviews: update own" on public.reviews for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "reviews: delete own or staff" on public.reviews;
create policy "reviews: delete own or staff" on public.reviews for delete using (user_id = auth.uid() or public.has_permission('reports.manage'));
drop trigger if exists reviews_touch on public.reviews;
create trigger reviews_touch before update on public.reviews for each row execute function public.touch_updated_at();

create or replace function public.anime_reviews(p_anime text, p_limit int default 20, p_offset int default 0)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t order by t.created_at desc), '[]') from (
    select r.id, r.score, r.body, r.spoiler, r.created_at, r.updated_at, r.user_id = auth.uid() as mine, public.author_card(r.user_id) as author
    from public.reviews r where r.anime_id = p_anime
    order by r.created_at desc limit least(greatest(p_limit, 1), 50) offset greatest(p_offset, 0)
  ) t;
$$;
grant execute on function public.anime_reviews(text, int, int) to anon, authenticated;

-- ═══════════════════════════ Comments (per title / episode) ═══════════════════════════
create table if not exists public.comments (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  anime_id   text not null check (char_length(anime_id) <= 40),
  episode    int check (episode between 1 and 100000),
  parent_id  bigint references public.comments (id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 2000),
  spoiler    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists comments_thread on public.comments (anime_id, episode, created_at desc);
alter table public.comments enable row level security;
drop policy if exists "comments: read" on public.comments;
create policy "comments: read" on public.comments for select using (true);
drop policy if exists "comments: write own" on public.comments;
create policy "comments: write own" on public.comments for insert with check (user_id = auth.uid());
drop policy if exists "comments: delete own or staff" on public.comments;
create policy "comments: delete own or staff" on public.comments for delete using (user_id = auth.uid() or public.has_permission('reports.manage'));

create or replace function public.comments_guard()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (select count(*) from public.comments where user_id = new.user_id and created_at > now() - interval '10 minutes') >= 20 then
    raise exception 'Too many comments — please wait a few minutes.';
  end if;
  return new;
end;
$$;
drop trigger if exists comments_guard on public.comments;
create trigger comments_guard before insert on public.comments for each row execute function public.comments_guard();

create or replace function public.anime_comments(p_anime text, p_episode int default null, p_limit int default 50)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t order by t.created_at), '[]') from (
    select c.id, c.parent_id, c.body, c.spoiler, c.created_at, c.user_id = auth.uid() as mine, public.author_card(c.user_id) as author
    from public.comments c
    where c.anime_id = p_anime and c.episode is not distinct from p_episode
    order by c.created_at desc limit least(greatest(p_limit, 1), 200)
  ) t;
$$;
grant execute on function public.anime_comments(text, int, int) to anon, authenticated;

-- ═══════════════════════════ Custom lists ═══════════════════════════
create table if not exists public.lists (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade default auth.uid(),
  title       text not null check (char_length(title) between 1 and 80),
  description text not null default '' check (char_length(description) <= 500),
  items       jsonb not null default '[]'::jsonb check (jsonb_typeof(items) = 'array' and jsonb_array_length(items) <= 200),
  is_public   boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists lists_user on public.lists (user_id, updated_at desc);
alter table public.lists enable row level security;
drop policy if exists "lists: read" on public.lists;
create policy "lists: read" on public.lists for select using (is_public or user_id = auth.uid());
drop policy if exists "lists: insert own" on public.lists;
create policy "lists: insert own" on public.lists for insert with check (user_id = auth.uid());
drop policy if exists "lists: update own" on public.lists;
create policy "lists: update own" on public.lists for update using (user_id = auth.uid()) with check (user_id = auth.uid());
drop policy if exists "lists: delete own" on public.lists;
create policy "lists: delete own" on public.lists for delete using (user_id = auth.uid() or public.has_permission('reports.manage'));
drop trigger if exists lists_touch on public.lists;
create trigger lists_touch before update on public.lists for each row execute function public.touch_updated_at();

create or replace function public.list_with_author(p_id uuid)
returns json language sql stable security definer set search_path = public as $$
  select json_build_object('list', row_to_json(l), 'author', public.author_card(l.user_id), 'mine', l.user_id = auth.uid())
  from public.lists l where l.id = p_id and (l.is_public or l.user_id = auth.uid());
$$;
grant execute on function public.list_with_author(uuid) to anon, authenticated;

create or replace function public.recent_public_lists(p_limit int default 24)
returns json language sql stable security definer set search_path = public as $$
  select coalesce(json_agg(t order by t.updated_at desc), '[]') from (
    select l.id, l.title, l.description, l.items, l.updated_at, public.author_card(l.user_id) as author
    from public.lists l where l.is_public and jsonb_array_length(l.items) > 0
    order by l.updated_at desc limit least(greatest(p_limit, 1), 60)
  ) t;
$$;
grant execute on function public.recent_public_lists(int) to anon, authenticated;

-- ═══════════════════════════ Client error log ═══════════════════════════
create table if not exists public.error_logs (
  id          bigint generated always as identity primary key,
  fingerprint text not null,
  message     text not null,
  stack       text,
  url         text,
  user_agent  text,
  release     text,
  user_id     uuid references auth.users (id) on delete set null,
  count       int not null default 1,
  first_seen  timestamptz not null default now(),
  last_seen   timestamptz not null default now(),
  resolved    boolean not null default false,
  unique (fingerprint)
);
create index if not exists error_logs_last on public.error_logs (last_seen desc);
alter table public.error_logs enable row level security;
drop policy if exists "errors: staff read" on public.error_logs;
create policy "errors: staff read" on public.error_logs for select using (public.has_permission('analytics.view'));
drop policy if exists "errors: staff update" on public.error_logs;
create policy "errors: staff update" on public.error_logs for update using (public.has_permission('analytics.view'));
drop policy if exists "errors: staff delete" on public.error_logs;
create policy "errors: staff delete" on public.error_logs for delete using (public.has_permission('analytics.view'));

-- Anyone may report; identical errors are counted instead of stored again.
create or replace function public.log_client_error(p_message text, p_stack text, p_url text, p_user_agent text, p_release text)
returns void language plpgsql security definer set search_path = public as $$
declare v_fp text := md5(left(coalesce(p_message, ''), 300) || '|' || left(coalesce(split_part(p_stack, E'\n', 2), ''), 300));
begin
  if (select count(*) from public.error_logs) > 5000 then return; end if;
  insert into public.error_logs (fingerprint, message, stack, url, user_agent, release, user_id)
  values (v_fp, left(p_message, 1000), left(p_stack, 4000), left(p_url, 500), left(p_user_agent, 300), left(p_release, 40), auth.uid())
  on conflict (fingerprint) do update set count = public.error_logs.count + 1, last_seen = now(), url = excluded.url, resolved = false;
end;
$$;
grant execute on function public.log_client_error(text, text, text, text, text) to anon, authenticated;

-- ═══════════════════════════ Web push ═══════════════════════════
create table if not exists public.push_subscriptions (
  id         bigint generated always as identity primary key,
  user_id    uuid not null references auth.users (id) on delete cascade default auth.uid(),
  endpoint   text not null unique check (char_length(endpoint) <= 1000),
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);
alter table public.push_subscriptions enable row level security;
drop policy if exists "push: own" on public.push_subscriptions;
create policy "push: own" on public.push_subscriptions for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Episodes already announced to a user (written by the send-push Edge Function).
create table if not exists public.push_sent (
  user_id  uuid not null references auth.users (id) on delete cascade,
  anime_id text not null,
  episode  int not null,
  sent_at  timestamptz not null default now(),
  primary key (user_id, anime_id, episode)
);
alter table public.push_sent enable row level security;

insert into public.feature_flags (key, enabled, description) values
  ('reviews', true, 'Reviews on anime pages.'),
  ('comments', true, 'Comments on anime and episode pages.'),
  ('social', true, 'Follows, activity feed and custom lists.'),
  ('push_notifications', true, 'Push notifications for new episodes (needs VAPID keys).')
on conflict (key) do nothing;

-- ───────────── 0007_anivia_push_auto.sql ─────────────
-- ANIVIA — push notifications without manual keys.
--
-- * app_secrets: server-only key/value store. RLS is on with no policies, so only the Edge Functions
--   (server key) can read it. The send-push function creates its VAPID key pair here on first use.
-- * cron_secret: random, generated here; protects the send-push function.
-- * pg_cron + pg_net call send-push every 30 minutes, so no GitHub secret is needed.
--
-- Safe to run more than once.

create table if not exists public.app_secrets (
  name text primary key,
  value text not null,
  created_at timestamptz not null default now()
);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;

insert into public.app_secrets (name, value)
values ('cron_secret', replace(gen_random_uuid()::text || gen_random_uuid()::text, '-', ''))
on conflict (name) do nothing;

create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'anivia-send-push',
  '*/30 * * * *',
  $job$
    select net.http_post(
      url := 'https://wnmvktajokjhufuzpamy.supabase.co/functions/v1/send-push',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-cron-secret', (select value from public.app_secrets where name = 'cron_secret')
      ),
      body := '{}'::jsonb
    );
  $job$
);

-- ───────────── Ellenőrzés / final check ─────────────
select
  (select count(*) from information_schema.columns where table_schema = 'public' and table_name = 'profiles' and column_name in ('avatar_url', 'banner_url')) = 2 as profile_images_ok,
  to_regclass('public.follows') is not null and to_regclass('public.reviews') is not null and to_regclass('public.comments') is not null and to_regclass('public.lists') is not null as community_ok,
  to_regclass('public.push_subscriptions') is not null as push_table_ok,
  exists (select 1 from public.app_secrets where name = 'cron_secret') as cron_secret_ok,
  exists (select 1 from cron.job where jobname = 'anivia-send-push') as push_schedule_ok,
  (select count(*) from public.feature_flags where key in ('oauth_google', 'oauth_discord', 'oauth_github', 'reviews', 'comments', 'social', 'push_notifications')) as new_flags;
