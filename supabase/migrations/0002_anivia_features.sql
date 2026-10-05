-- ANIVIA — contact/report inbox, ratings, character favorites, public profiles, account deletion
-- Run after 0001 (SQL Editor → paste → Run, or `npm run db:migrate`). Safe to re-run.

-- ── Extra synced library fields ─────────────────────────────────────────────
alter table public.user_library add column if not exists ratings             jsonb not null default '{}'::jsonb;
alter table public.user_library add column if not exists favorite_characters jsonb not null default '[]'::jsonb;

-- ── Public profiles ─────────────────────────────────────────────────────────
alter table public.profiles add column if not exists is_public    boolean not null default false;
alter table public.profiles add column if not exists show_history boolean not null default true;

drop policy if exists "profiles: read public" on public.profiles;
create policy "profiles: read public" on public.profiles for select using (is_public);

-- Returns a public profile with its shareable library (never email or private data).
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
      'avatar_hue', p.avatar_hue, 'created_at', p.created_at, 'show_history', p.show_history
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

-- ── Contact messages & content reports (write-only inbox) ──────────────────
create table if not exists public.contact_messages (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users (id) on delete set null default auth.uid(),
  name       text not null check (char_length(name) between 1 and 80),
  email      text not null check (email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$' and char_length(email) <= 254),
  topic      text not null check (topic in ('general', 'playback', 'account', 'feedback', 'partnership')),
  message    text not null check (char_length(message) between 10 and 4000),
  status     text not null default 'new' check (status in ('new', 'read', 'done'))
);

create table if not exists public.reports (
  id         bigint generated always as identity primary key,
  created_at timestamptz not null default now(),
  user_id    uuid references auth.users (id) on delete set null default auth.uid(),
  subject    text not null check (char_length(subject) between 1 and 200),
  page_url   text check (char_length(page_url) <= 500),
  reason     text not null check (char_length(reason) between 1 and 60),
  details    text not null default '' check (char_length(details) <= 1000),
  status     text not null default 'new' check (status in ('new', 'triaged', 'resolved'))
);

alter table public.contact_messages enable row level security;
alter table public.reports enable row level security;

-- Anyone may submit; nobody can read through the API (review them in the dashboard).
drop policy if exists "contact: submit" on public.contact_messages;
create policy "contact: submit" on public.contact_messages for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());
drop policy if exists "reports: submit" on public.reports;
create policy "reports: submit" on public.reports for insert to anon, authenticated
  with check (user_id is null or user_id = auth.uid());

-- Simple flood protection: max 5 submissions per user (or anonymous total) per 10 minutes.
create or replace function public.limit_submissions()
returns trigger language plpgsql security definer set search_path = public as $$
declare recent int;
begin
  execute format('select count(*) from %I.%I where created_at > now() - interval ''10 minutes'' and user_id is not distinct from $1', tg_table_schema, tg_table_name)
    into recent using new.user_id;
  if recent >= case when new.user_id is null then 30 else 5 end then
    raise exception 'Too many submissions — please try again later.';
  end if;
  return new;
end;
$$;
drop trigger if exists contact_limit on public.contact_messages;
create trigger contact_limit before insert on public.contact_messages for each row execute function public.limit_submissions();
drop trigger if exists reports_limit on public.reports;
create trigger reports_limit before insert on public.reports for each row execute function public.limit_submissions();

-- ── Self-service account deletion ───────────────────────────────────────────
-- Deletes the calling user; profile and library rows cascade.
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;
revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
