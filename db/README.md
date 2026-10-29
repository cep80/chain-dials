# Database (CargoBase)

Accounts, Pro entitlement and saved data live in the `api` schema of the
CargoBase instance at `CARGOBASE_URL`, served by PostgREST. Row-level security
is what keeps users apart, so these files are the record of it.

| File | Purpose |
|------|---------|
| `schema.sql` | Intended tables, grants and policies. Rebuilds the schema on a fresh instance. |
| `migrations/` | Changes to apply to production, in order, via the studio SQL editor (read-only off). |
| `export-policies.sql` | Dumps the live policies, grants, RLS flags and indexes. Run it and reconcile with `schema.sql`. |

## Access model

- Users act with their own CargoBase token. Every table limits them to rows
  where `user_id = auth.uid()`.
- `profiles` holds Pro entitlement and is **read-only to users**. Only the
  service role writes it: `src/app/api/auth/register` and the Stripe webhook.
- `anon` has no access.

The CargoBase gateway is public and its login needs no key, so anyone with an
account can call PostgREST directly with their token. Never rely on the app's
API routes alone to protect a table.

## Verify

```bash
npm run verify:rls
# with a non-Pro test account, also proves users cannot set their own entitlement:
VERIFY_EMAIL=... VERIFY_PASSWORD=... npm run verify:rls
```

The script changes no data.
