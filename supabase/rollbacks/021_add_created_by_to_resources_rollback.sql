-- 021_add_created_by_to_resources_rollback.sql
-- Manual rollback for 021. Drops the sync triggers, the shared sync function,
-- and the created_by columns + their indexes.

BEGIN;

DROP TRIGGER IF EXISTS public_views_sync_created_by             ON public_views;
DROP TRIGGER IF EXISTS customer_request_forms_sync_created_by   ON customer_request_forms;
DROP TRIGGER IF EXISTS branding_settings_sync_created_by        ON branding_settings;
DROP TRIGGER IF EXISTS custom_domains_sync_created_by           ON custom_domains;
DROP TRIGGER IF EXISTS roadmaps_sync_created_by                 ON roadmaps;

DROP FUNCTION IF EXISTS sync_user_id_created_by();

DROP INDEX IF EXISTS idx_public_views_created_by;
DROP INDEX IF EXISTS idx_customer_request_forms_created_by;
DROP INDEX IF EXISTS idx_branding_settings_created_by;
DROP INDEX IF EXISTS idx_custom_domains_created_by;
DROP INDEX IF EXISTS idx_roadmaps_created_by;

ALTER TABLE public_views          DROP COLUMN created_by;
ALTER TABLE customer_request_forms DROP COLUMN created_by;
ALTER TABLE branding_settings      DROP COLUMN created_by;
ALTER TABLE custom_domains         DROP COLUMN created_by;
ALTER TABLE roadmaps               DROP COLUMN created_by;

COMMIT;
