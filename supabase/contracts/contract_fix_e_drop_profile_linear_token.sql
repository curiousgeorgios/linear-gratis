-- contract_fix_e_drop_profile_linear_token.sql
-- Contract phase for Fix E (ADR 0001). Target release: v0.11.0.
--
-- Prerequisite: every Linear token read/write goes through
-- organisation_linear_connections. The /api/profile/linear-token route
-- already writes both locations as of the expand migrate. Remove the legacy
-- profile mirror writes before applying this contract, otherwise the route
-- will error on the no-longer-existing column.
--
-- Grep prerequisite:
--   grep -rn "linear_api_token" src/
--   # Should return only references to organisation_linear_connections.linear_api_token.

BEGIN;

-- Drop the sync trigger first since it fires on UPDATE OF linear_api_token
-- on profiles; otherwise dropping the column raises.
DROP TRIGGER IF EXISTS profiles_sync_token_to_connection ON profiles;
DROP FUNCTION IF EXISTS sync_profile_token_to_connection();

ALTER TABLE profiles DROP COLUMN linear_api_token;

COMMIT;
