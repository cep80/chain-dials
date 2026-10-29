-- Chain Dials: accounts, Pro entitlement and saved data.
--
-- Access model:
-- - Users reach these tables with their own Supabase access token. RLS limits
--   every statement to rows where user_id = auth.uid().
-- - profiles carries Pro entitlement and is read-only to users. Only the
--   service role writes it (Stripe webhook, checkout); a trigger creates the row
--   when a user signs up. Without this, any signed-in user could PATCH their
--   own pro_status straight at the Data API.
-- - anon has no access to anything here.
-- - Every user_id references auth.users with ON DELETE CASCADE, so deleting a
--   user (account deletion) removes all of their rows.
--
-- Supabase's default privileges grant ALL on new public tables to anon and
-- authenticated, so grants are revoked and then given back explicitly.

create table public.profiles (
  user_id uuid primary key references auth.users (id) on delete cascade,
  email text,
  stripe_customer_id text unique,
  stripe_subscription_id text,
  pro_status text not null default 'none',
  pro_current_period_end timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.layouts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  chain_id text not null,
  favorites jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.alert_rules (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  chain_id text not null,
  kind text not null,
  enabled boolean not null default true,
  params jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.wall_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.desk_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  name text not null,
  chain_id text not null default 'btc',
  payload jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index layouts_user_id_idx on public.layouts (user_id);
create index alert_rules_user_id_idx on public.alert_rules (user_id);
create index wall_packs_user_id_idx on public.wall_packs (user_id);
create index desk_packs_user_id_idx on public.desk_packs (user_id);

alter table public.profiles enable row level security;
alter table public.layouts enable row level security;
alter table public.alert_rules enable row level security;
alter table public.wall_packs enable row level security;
alter table public.desk_packs enable row level security;

revoke all on public.profiles, public.layouts, public.alert_rules, public.wall_packs, public.desk_packs
  from anon, authenticated;
grant all on public.profiles, public.layouts, public.alert_rules, public.wall_packs, public.desk_packs
  to service_role;

-- profiles: read own row only.
grant select on public.profiles to authenticated;
create policy profiles_select_own on public.profiles
  for select to authenticated using (user_id = (select auth.uid()));

-- User-owned data: full CRUD on own rows.
do $$
declare t text;
begin
  foreach t in array array['layouts', 'alert_rules', 'wall_packs', 'desk_packs'] loop
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (user_id = (select auth.uid()))', t || '_select_own', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (user_id = (select auth.uid()))', t || '_insert_own', t);
    execute format('create policy %I on public.%I for update to authenticated using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()))', t || '_update_own', t);
    execute format('create policy %I on public.%I for delete to authenticated using (user_id = (select auth.uid()))', t || '_delete_own', t);
  end loop;
end $$;

-- Every account gets a profile the moment it exists, so entitlement reads never
-- miss and no app code has to create it with elevated rights.
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (user_id, email)
  values (new.id, new.email)
  on conflict (user_id) do nothing;
  return new;
end;
$$;
revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
