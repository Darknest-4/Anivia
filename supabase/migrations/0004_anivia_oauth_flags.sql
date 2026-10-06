-- ANIVIA — feature flags for the social sign-in buttons (Google / Discord / GitHub).
-- The buttons stay hidden until you enable the provider in Supabase → Authentication → Providers
-- AND switch its flag on in Admin → Feature flags. Safe to re-run.
insert into public.feature_flags (key, enabled, description) values
  ('oauth_google', false, 'Show “Continue with Google” (enable the Google provider in Supabase first).'),
  ('oauth_discord', false, 'Show “Continue with Discord” (enable the Discord provider in Supabase first).'),
  ('oauth_github', false, 'Show “Continue with GitHub” (enable the GitHub provider in Supabase first).')
on conflict (key) do nothing;
