# ADR 0001 runbook: applying migrations 019 through 023

This is the operational companion to `0001-tenancy-and-publishable-resources.md`. Run this against a non-production branch first.

## Pre-flight

1. Take a database backup (Supabase: project > Database > Backups > Create on-demand backup).
2. Confirm there are no cross-type slug collisions. Migration 023 has its own pre-flight that aborts on conflict, but it's cheaper to check first:

   ```sql
   SELECT slug, string_agg(source, ',')
   FROM (
     SELECT slug, 'view'    AS source FROM public_views
     UNION ALL
     SELECT slug, 'form'    AS source FROM customer_request_forms
     UNION ALL
     SELECT slug, 'roadmap' AS source FROM roadmaps
   ) s
   GROUP BY slug
   HAVING COUNT(*) > 1;
   ```

   Resolve any rows returned by renaming one side of the collision before proceeding.

3. Confirm `profiles.linear_api_token` is populated for every org owner who has connected Linear. Migration 022's backfill copies tokens from profiles to `organisation_linear_connections`; any owner without a token will have an org with no connection row and the lazy workspace discovery (see follow-up tasks) will create one on next Linear OAuth.

## Apply

Migrations 019 through 023 must apply in order. The Supabase CLI handles this automatically:

```bash
supabase db push --linked
```

The CLI compares your local `supabase/migrations/` against the `supabase_migrations.schema_migrations` tracker and applies anything new in numeric order. All five migrations are wrapped in single transactions; on any failure, the entire migration rolls back and the tracker is not updated.

`supabase/rollbacks/` is deliberately outside `supabase/migrations/` so the CLI ignores it.

## Verify

After apply, smoke-check each invariant:

```sql
-- Fix B: roadmap_comments has organisation_id
SELECT count(*) FROM roadmap_comments WHERE organisation_id IS NULL; -- expect 0
SELECT count(*) FROM roadmap_votes    WHERE organisation_id IS NULL; -- expect 0

-- Fix C: linear_* columns populated
SELECT count(*) FROM customer_request_forms WHERE linear_project_id IS NULL; -- expect 0
SELECT count(*) FROM roadmap_votes          WHERE linear_issue_id   IS NULL; -- expect 0

-- Fix D: created_by populated
SELECT count(*) FROM roadmaps               WHERE created_by IS NULL; -- expect 0
SELECT count(*) FROM customer_request_forms WHERE created_by IS NULL; -- expect 0

-- Fix E: one connection per org with a token
SELECT organisation_id, count(*)
FROM organisation_linear_connections
GROUP BY organisation_id
HAVING count(*) > 1; -- expect 0 rows (one connection per org, post-backfill)

-- Fix F: every extension row has a public_resource_id
SELECT count(*) FROM public_views          WHERE public_resource_id IS NULL; -- expect 0
SELECT count(*) FROM customer_request_forms WHERE public_resource_id IS NULL; -- expect 0
SELECT count(*) FROM roadmaps               WHERE public_resource_id IS NULL; -- expect 0
```

## Rollback

Each migration has a matching rollback in `supabase/rollbacks/`. To revert one migration:

1. Revert the application code to a commit from before the migration shipped (most relevant for 022 and 023 which add load-bearing FKs).
2. Apply the rollback manually:

   ```bash
   psql "$DATABASE_URL" -f supabase/rollbacks/02X_*.sql
   ```

3. Reconcile the `supabase_migrations.schema_migrations` tracker:

   ```sql
   DELETE FROM supabase_migrations.schema_migrations WHERE version = '02X';
   ```

Rollbacks are not idempotent and not reversible. Use only after taking a backup.

## Post-apply follow-ups

These do not require additional migrations:

- Lazy `linear_workspace_id` discovery: see `src/lib/linear-connection.ts`. First Linear call against a connection patches the row.
- Application-code sweep for remaining `user_id` / `project_id` / `issue_id` reads (cosmetic, blocks the contract migrations).
- Contract migrations: see `supabase/contracts/` for drafts.
