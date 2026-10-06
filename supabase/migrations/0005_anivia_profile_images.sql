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
