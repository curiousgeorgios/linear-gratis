# Schema tests

These SQL files exercise the invariants introduced by migrations 019 through 023. They run as PostgreSQL scripts and are designed to be invoked against a database that already has all migrations applied (typically a local Supabase shadow database, never production).

Each test wraps itself in a transaction that `ROLLBACK`s on exit so the database is left clean. Failures `RAISE EXCEPTION` so any test failure aborts the whole script with a clear message.

## Running

Against a local Supabase instance:

```bash
for f in supabase/tests/*.sql; do
  echo "=== $f ==="
  psql "$DATABASE_URL" -f "$f" -v ON_ERROR_STOP=1
done
```

Against a Supabase project's shadow database (the temporary database the CLI builds during `db push`):

```bash
supabase db reset --linked   # rebuilds shadow + applies all migrations
# then run psql against the shadow URL
```

`supabase test db` is the alternative entry point if you want to standardise on pgTAP. The assertions in these files match what `ok()` and `is()` would express; switching is a mechanical refactor if you prefer the pgTAP idiom later.

## What's covered

| File | Migration | Invariant |
|---|---|---|
| 019_org_scoped_moderation.sql | 019 | Non-creator org member can moderate roadmap comments |
| 020_sync_triggers.sql | 020 | Legacy and linear_* columns stay in sync on INSERT and UPDATE |
| 021_user_id_created_by_sync.sql | 021 | user_id and created_by stay in sync on INSERT and UPDATE |
| 022_same_org_connection_fk.sql | 022 | Composite FK rejects a resource pointing at another org's connection |
| 023_cross_type_slug_uniqueness.sql | 023 | Inserting two resources of different types with the same slug fails |

## What's deliberately not covered

- Application-layer authentication and RLS-via-session behaviour. Those are integration concerns and belong in a higher-level test harness.
- Production data correctness (no test should ever touch real rows).
- Performance characteristics of the sync triggers under load. If a regression shows up, write a separate benchmark.
