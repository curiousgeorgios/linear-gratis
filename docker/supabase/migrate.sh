#!/bin/sh
# One-shot job: wait for GoTrue and Storage to create their schemas, then apply
# the repository's forward migrations in order. Uses the same ledger as the
# Supabase CLI (supabase_migrations.schema_migrations), so the database stays
# compatible with `supabase db push` later on.
set -eu

export PGPASSWORD="$POSTGRES_PASSWORD"
PSQL="psql -h db -U supabase_admin -d postgres -v ON_ERROR_STOP=1 -X -q"

echo "[migrate] waiting for auth.users and storage.buckets..."
i=0
until [ "$($PSQL -tAc "select (to_regclass('auth.users') is not null and to_regclass('storage.buckets') is not null)::int" 2>/dev/null || echo 0)" = "1" ]; do
  i=$((i + 1))
  if [ "$i" -gt 90 ]; then echo "[migrate] timed out waiting for auth/storage schemas" >&2; exit 1; fi
  sleep 2
done

$PSQL <<'SQL'
create schema if not exists supabase_migrations;
create table if not exists supabase_migrations.schema_migrations (
  version text primary key,
  statements text[],
  name text
);
SQL

applied=0
for file in $(ls /migrations/*.sql | sort); do
  base="$(basename "$file" .sql)"
  version="${base%%_*}"
  name="${base#*_}"
  if [ "$($PSQL -tAc "select 1 from supabase_migrations.schema_migrations where version = '$version'")" = "1" ]; then
    continue
  fi
  echo "[migrate] applying $base"
  $PSQL -f "$file"
  $PSQL -c "insert into supabase_migrations.schema_migrations (version, name) values ('$version', '$name')"
  applied=$((applied + 1))
done

echo "[migrate] done ($applied applied)"
