-- ANIVIA — accounts & library sync schema
-- Run once in the Supabase dashboard: SQL Editor → New query → paste → Run.
-- Safe to re-run.

-- ── Profiles ────────────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  username     text unique check (username ~ '^[a-zA-Z0-9_.-]{3,24}$'),
  display_name text not null default 'New member' check (char_length(display_name) between 1 and 48),
  bio          text not null default '' check (char_length(bio) <= 280),
  avatar_hue   int  not null default 348 check (avatar_hue between 0 and 360),
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

alter table public.profiles enable row level security;

drop policy if exists "profiles: read own"   on public.profiles;
drop policy if exists "profiles: insert own" on public.profiles;
drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: read own"   on public.profiles for select using (auth.uid() = id);
create policy "profiles: insert own" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles: update own" on public.profiles for update using (auth.uid() = id) with check (auth.uid() = id);

-- ── Library (watchlist, history, favorites, preferences) ───────────────────
-- One row per user; each list is stored as JSON and merged client-side.
create table if not exists public.user_library (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  watchlist   jsonb not null default '[]'::jsonb,
  history     jsonb not null default '[]'::jsonb,
  favorites   jsonb not null default '[]'::jsonb,
  preferences jsonb not null default '{}'::jsonb,
  updated_at  timestamptz not null default now(),
  -- keep rows bounded (~1 MB)
  constraint user_library_size check (pg_column_size(watchlist) + pg_column_size(history) + pg_column_size(favorites) + pg_column_size(preferences) < 1048576)
);

alter table public.user_library enable row level security;

drop policy if exists "library: read own"   on public.user_library;
drop policy if exists "library: insert own" on public.user_library;
drop policy if exists "library: update own" on public.user_library;
drop policy if exists "library: delete own" on public.user_library;
create policy "library: read own"   on public.user_library for select using (auth.uid() = user_id);
create policy "library: insert own" on public.user_library for insert with check (auth.uid() = user_id);
create policy "library: update own" on public.user_library for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "library: delete own" on public.user_library for delete using (auth.uid() = user_id);

-- ── New users get a profile + empty library automatically ──────────────────
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name, avatar_hue)
  values (
    new.id,
    coalesce(nullif(left(new.raw_user_meta_data ->> 'display_name', 48), ''), nullif(left(new.raw_user_meta_data ->> 'full_name', 48), ''), split_part(new.email, '@', 1), 'New member'),
    (abs(hashtext(new.id::text)) % 361)
  )
  on conflict (id) do nothing;

  insert into public.user_library (user_id) values (new.id) on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Keep updated_at fresh
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_touch on public.profiles;
create trigger profiles_touch before update on public.profiles for each row execute function public.touch_updated_at();
drop trigger if exists user_library_touch on public.user_library;
create trigger user_library_touch before update on public.user_library for each row execute function public.touch_updated_at();

-- Backfill users created before this migration
insert into public.profiles (id, display_name)
  select id, coalesce(split_part(email, '@', 1), 'New member') from auth.users
  on conflict (id) do nothing;
insert into public.user_library (user_id) select id from auth.users on conflict (user_id) do nothing;
