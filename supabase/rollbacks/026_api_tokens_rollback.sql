-- Manual rollback for 026_api_tokens.sql
BEGIN;
DROP TABLE IF EXISTS api_tokens;
COMMIT;
