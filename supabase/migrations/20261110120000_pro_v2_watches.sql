-- Pro v2: watches replace alert rules.
--
-- Alert rules only ever fired while the Alerts page was open, and are retired.
-- Watches are evaluated by the server every minute (see the cron job at the
-- bottom) and notify by phone push or Telegram.
--
-- Access model, extending 20261029120000_chain_dials.sql:
-- - Users may read and delete their own watches, events and notify targets.
--   They may not insert or update them directly: the free allowance (one
--   watch) is enforced by the API, which writes with the service role.
-- - engine_state and notify_link_codes are service-role only.

drop table if exists public.alert_rules;

-- App Store / Google Play Pro via RevenueCat, kept apart from Stripe's
-- pro_status so neither billing path can overwrite the other.
alter table public.profiles
  add column store_status text not null default 'none',
  add column store_period_end timestamptz;

create table public.watches (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  kind text not null check (kind in ('tx', 'address', 'solo')),
  chain_id text not null default 'btc',
  target text not null,
  label text,
  -- User settings, e.g. { "ths": 1.2 } for a solo miner's hashrate.
  params jsonb not null default '{}'::jsonb,
  -- Engine bookkeeping between ticks; never user-editable.
  state jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  done_at timestamptz,
  unique (user_id, kind, target)
);
create index watches_active_idx on public.watches (created_at) where done_at is null;

create table public.watch_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  watch_id uuid references public.watches (id) on delete set null,
  title text not null,
  body text not null,
  -- Comma-separated channels that accepted it, or 'none'.
  channel text not null,
  status text not null check (status in ('sent', 'partial', 'failed', 'no_target')),
  at timestamptz not null default now()
);
create index watch_events_user_at_idx on public.watch_events (user_id, at desc);

create table public.notify_targets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  channel text not null check (channel in ('push_ios', 'push_android', 'telegram')),
  token text not null,
  created_at timestamptz not null default now(),
  last_ok_at timestamptz,
  unique (channel, token)
);
create index notify_targets_user_idx on public.notify_targets (user_id);

-- One-time codes that link a Telegram chat to an account via /start <code>.
create table public.notify_link_codes (
  code text primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  expires_at timestamptz not null
);

create table public.engine_state (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  locked_until timestamptz
);
insert into public.engine_state (key) values ('tick') on conflict do nothing;

alter table public.watches enable row level security;
alter table public.watch_events enable row level security;
alter table public.notify_targets enable row level security;
alter table public.notify_link_codes enable row level security;
alter table public.engine_state enable row level security;

revoke all on public.watches, public.watch_events, public.notify_targets,
  public.notify_link_codes, public.engine_state from anon, authenticated;
grant all on public.watches, public.watch_events, public.notify_targets,
  public.notify_link_codes, public.engine_state to service_role;

do $$
declare t text;
begin
  foreach t in array array['watches', 'watch_events', 'notify_targets'] loop
    execute format('grant select, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end $$;

create trigger set_updated_at before update on public.watches
  for each row execute function public.set_updated_at();

-- Every minute, Supabase calls the app's tick route. The URL and the shared
-- secret live in Vault so they stay out of the repo:
--   select vault.create_secret('https://chaindials.com/api/cron/tick', 'tick_url');
--   select vault.create_secret('<same value as CRON_SECRET>', 'cron_secret');
-- Until both exist the job runs and fails quietly.
create extension if not exists pg_cron;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'chain-dials-tick',
  '* * * * *',
  $$
  select net.http_post(
    url := (select decrypted_secret from vault.decrypted_secrets where name = 'tick_url'),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_secret')
    ),
    body := '{}'::jsonb,
    timeout_milliseconds := 55000
  );
  $$
);

-- Event history is kept for 30 days.
select cron.schedule(
  'chain-dials-prune-watch-events',
  '17 3 * * *',
  $$ delete from public.watch_events where at < now() - interval '30 days';
     delete from public.notify_link_codes where expires_at < now(); $$
);
