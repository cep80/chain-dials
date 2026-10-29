-- Chain Dials tables on CargoBase (schema `api`, served by PostgREST).
--
-- Reconstructed 2026-10-28 from the production PostgREST description plus the
-- CargoBase studio's table-creation defaults. This is the intended state; the
-- live policies have not been exported yet. Run db/export-policies.sql in the
-- studio SQL editor and reconcile any difference here before relying on this
-- file to rebuild the database.
--
-- Access model:
-- - Users reach these tables with their own CargoBase token. RLS limits every
--   statement to rows where user_id = auth.uid().
-- - profiles carries Pro entitlement and is read-only to users. Only the
--   service role writes it (src/app/api/auth/register, src/app/api/billing/webhook).
-- - anon has no access.

CREATE TABLE IF NOT EXISTS api.profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  email text,
  stripe_customer_id text,
  stripe_subscription_id text,
  pro_status text NOT NULL DEFAULT 'none',
  pro_current_period_end timestamptz,
  project_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS profiles_user_id_key ON api.profiles (user_id);

CREATE TABLE IF NOT EXISTS api.layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  chain_id text NOT NULL,
  favorites jsonb NOT NULL,
  project_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api.alert_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  chain_id text NOT NULL,
  kind text NOT NULL,
  enabled boolean NOT NULL DEFAULT true,
  params jsonb NOT NULL,
  project_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api.wall_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  payload jsonb NOT NULL,
  project_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS api.desk_packs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  name text NOT NULL,
  chain_id text NOT NULL DEFAULT 'btc',
  payload jsonb NOT NULL,
  project_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE api.profiles    ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.layouts     ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.wall_packs  ENABLE ROW LEVEL SECURITY;
ALTER TABLE api.desk_packs  ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON api.profiles, api.layouts, api.alert_rules, api.wall_packs, api.desk_packs FROM anon;
GRANT ALL ON api.profiles, api.layouts, api.alert_rules, api.wall_packs, api.desk_packs TO service_role;

-- profiles: read own row only.
GRANT SELECT ON api.profiles TO authenticated;
DROP POLICY IF EXISTS profiles_select_own ON api.profiles;
CREATE POLICY profiles_select_own ON api.profiles
  FOR SELECT TO authenticated USING (user_id = auth.uid());

-- User-owned data: full CRUD on own rows.
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['layouts', 'alert_rules', 'wall_packs', 'desk_packs'] LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON api.%I TO authenticated', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON api.%I', t || '_select_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON api.%I', t || '_insert_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON api.%I', t || '_update_own', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON api.%I', t || '_delete_own', t);
    EXECUTE format('CREATE POLICY %I ON api.%I FOR SELECT TO authenticated USING (user_id = auth.uid())', t || '_select_own', t);
    EXECUTE format('CREATE POLICY %I ON api.%I FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid())', t || '_insert_own', t);
    EXECUTE format('CREATE POLICY %I ON api.%I FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid())', t || '_update_own', t);
    EXECUTE format('CREATE POLICY %I ON api.%I FOR DELETE TO authenticated USING (user_id = auth.uid())', t || '_delete_own', t);
  END LOOP;
END $$;

NOTIFY pgrst, 'reload schema';
