-- Users must not be able to write their own entitlement.
--
-- Tables created through the CargoBase studio with RLS on get *_insert_own,
-- *_update_own and *_delete_own policies plus INSERT/UPDATE/DELETE grants for
-- `authenticated`. On `profiles` that lets any signed-in user PATCH their own
-- row to pro_status = 'active' straight at the gateway, and the app trusts that
-- row. The app only ever writes profiles with the service role (register route
-- and Stripe webhook), so users need SELECT and nothing else.
--
-- Idempotent: safe to run whether or not the default policies still exist.

BEGIN;

DROP POLICY IF EXISTS profiles_insert_own ON api.profiles;
DROP POLICY IF EXISTS profiles_update_own ON api.profiles;
DROP POLICY IF EXISTS profiles_delete_own ON api.profiles;

REVOKE INSERT, UPDATE, DELETE ON api.profiles FROM authenticated;

-- Studio tables also grant SELECT to anon. RLS already returns no rows to anon
-- (no anon policies), but nothing here is meant to be public, so drop the grant.
REVOKE ALL ON api.profiles, api.layouts, api.alert_rules, api.wall_packs, api.desk_packs FROM anon;

NOTIFY pgrst, 'reload schema';

COMMIT;
