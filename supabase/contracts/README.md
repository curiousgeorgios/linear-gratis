# Contract migration drafts

These SQL files are the contract phase of the expand-migrate-contract cycle started by migrations 019 through 023. They are **drafts**: they sit outside `supabase/migrations/` so `supabase db push` does not pick them up automatically.

## When to promote a contract

Each contract drops a legacy column and its sync triggers. Before promoting:

1. Verify the application layer has fully migrated to the new column name. Grep the codebase; the legacy reference count should be 0 (or near-zero with documented exceptions).
2. Verify the corresponding expand migration has been live in production for at least one release. Contract migrations are not reversible without a backup restore.
3. Take a database backup before applying.

To promote, rename and move the file:

```bash
git mv supabase/contracts/contract_fix_X.sql \
       supabase/migrations/0YY_contract_fix_X.sql
```

The next free migration number at the time of promotion is the one to use.

## Contract index

| File | Drops | Target release | App-layer prerequisite |
|---|---|---|---|
| contract_fix_c_drop_legacy_external_ids.sql | project_id, project_name, team_id, team_name, project_ids, issue_id (across 5 tables); sync triggers and functions | v0.9.0 | All reads/writes use linear_-prefixed columns |
| contract_fix_d_drop_user_id_from_resources.sql | user_id from public_views, customer_request_forms, branding_settings, custom_domains, roadmaps; sync_user_id_created_by; rewrites INSERT RLS to drop the user_id check | v0.10.0 | All reads/writes use created_by; ownership checks use org membership |
| contract_fix_e_drop_profile_linear_token.sql | profiles.linear_api_token; sync_profile_token_to_connection trigger | v0.11.0 | All Linear token reads go through organisation_linear_connections |
| contract_fix_f_drop_duplicated_shared_columns.sql | slug, password_hash, expires_at, is_active duplicated on extension tables; drops AFTER UPDATE sync triggers; the canonical home is public_resources | v0.12.0 | All slug routing reads through public_resources; password and expiry gates go through public-resource.ts |

## Why drafts and not direct migrations

Permanent transitional state is the most expensive failure mode of expand-migrate-contract refactors. Writing the contracts at the time of the expand (a) forces the writer to confirm the contract is actually possible from the schema side, (b) creates a visible artefact that's easy to find when it's time to promote, (c) avoids the rebuilt-from-memory variant of the contract that diverges from the original expand's invariants.
