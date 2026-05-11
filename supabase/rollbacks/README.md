# Manual Rollbacks

These SQL files are manual rollback scripts. They must stay outside
`supabase/migrations` because Supabase applies every SQL file in that directory
during `supabase db push` and `supabase db reset`.

Run a rollback only after reverting the application code to the matching schema
version, then execute the SQL manually with `supabase db execute` or `psql`.
