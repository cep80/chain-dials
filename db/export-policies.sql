-- Paste into the CargoBase studio SQL editor (read-only is fine) and save the
-- output next to this file. It is the record of what production actually
-- enforces, to reconcile against db/schema.sql.

SELECT 'policy' AS kind, tablename AS "table", policyname AS name,
       cmd, array_to_string(roles, ',') AS roles,
       qual AS using_expr, with_check AS check_expr
FROM pg_policies
WHERE schemaname = 'api'
UNION ALL
SELECT 'grant', table_name, grantee, privilege_type, NULL, NULL, NULL
FROM information_schema.role_table_grants
WHERE table_schema = 'api' AND grantee IN ('anon', 'authenticated')
UNION ALL
SELECT 'rls', relname, NULL, CASE WHEN relrowsecurity THEN 'enabled' ELSE 'DISABLED' END, NULL, NULL, NULL
FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE n.nspname = 'api' AND c.relkind = 'r'
UNION ALL
SELECT 'index', tablename, indexname, indexdef, NULL, NULL, NULL
FROM pg_indexes
WHERE schemaname = 'api'
ORDER BY 1, 2, 3;
