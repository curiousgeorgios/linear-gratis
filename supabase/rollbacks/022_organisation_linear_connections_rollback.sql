-- 022_organisation_linear_connections_rollback.sql
-- Manual rollback for 022. Drops linear_connection_id columns, the composite
-- FKs, the sync trigger, the new RLS policies and the table.
--
-- DESTRUCTIVE: any updated linear_api_token values written ONLY to
-- organisation_linear_connections (and not to profiles.linear_api_token)
-- will be lost. The sync trigger keeps them aligned for the personal-org
-- case, but multi-connection orgs (post-Fix E app code) will have token
-- state only in the connections table.

BEGIN;

-- 1. Drop sync trigger and function
DROP TRIGGER IF EXISTS profiles_sync_token_to_connection ON profiles;
DROP FUNCTION IF EXISTS sync_profile_token_to_connection();

-- 2. Drop linear_connection_id columns and composite FKs from resource tables
ALTER TABLE roadmaps
  DROP CONSTRAINT IF EXISTS roadmaps_linear_connection_same_org_fk,
  DROP COLUMN IF EXISTS linear_connection_id;
DROP INDEX IF EXISTS idx_roadmaps_linear_connection_id;

ALTER TABLE customer_request_forms
  DROP CONSTRAINT IF EXISTS customer_request_forms_linear_connection_same_org_fk,
  DROP COLUMN IF EXISTS linear_connection_id;
DROP INDEX IF EXISTS idx_customer_request_forms_linear_connection_id;

ALTER TABLE public_views
  DROP CONSTRAINT IF EXISTS public_views_linear_connection_same_org_fk,
  DROP COLUMN IF EXISTS linear_connection_id;
DROP INDEX IF EXISTS idx_public_views_linear_connection_id;

-- 3. Drop the connections table (cascades the RLS policies and unique constraints)
DROP TABLE IF EXISTS organisation_linear_connections;

COMMIT;
