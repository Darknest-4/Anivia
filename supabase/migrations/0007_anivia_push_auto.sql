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
