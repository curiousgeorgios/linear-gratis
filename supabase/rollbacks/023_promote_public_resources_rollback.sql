-- 023_promote_public_resources_rollback.sql
-- Manual rollback for 023. Drops all triggers, the public_resource_id
-- columns + composite FKs from extension tables, then drops public_resources.

BEGIN;

-- 1. Drop triggers on extension tables
DROP TRIGGER IF EXISTS z_public_views_create_public_resource          ON public_views;
DROP TRIGGER IF EXISTS z_customer_request_forms_create_public_resource ON customer_request_forms;
DROP TRIGGER IF EXISTS z_roadmaps_create_public_resource              ON roadmaps;

DROP TRIGGER IF EXISTS public_views_sync_public_resource            ON public_views;
DROP TRIGGER IF EXISTS customer_request_forms_sync_public_resource  ON customer_request_forms;
DROP TRIGGER IF EXISTS roadmaps_sync_public_resource                ON roadmaps;

DROP TRIGGER IF EXISTS public_views_delete_public_resource          ON public_views;
DROP TRIGGER IF EXISTS customer_request_forms_delete_public_resource ON customer_request_forms;
DROP TRIGGER IF EXISTS roadmaps_delete_public_resource              ON roadmaps;

-- 2. Drop trigger functions
DROP FUNCTION IF EXISTS create_public_resource_for_view();
DROP FUNCTION IF EXISTS create_public_resource_for_form();
DROP FUNCTION IF EXISTS create_public_resource_for_roadmap();
DROP FUNCTION IF EXISTS sync_public_resource_from_view();
DROP FUNCTION IF EXISTS sync_public_resource_from_form();
DROP FUNCTION IF EXISTS sync_public_resource_from_roadmap();
DROP FUNCTION IF EXISTS delete_public_resource_for_extension();

-- 3. Drop composite FKs, indexes and columns on extension tables
ALTER TABLE public_views
  DROP CONSTRAINT IF EXISTS public_views_resource_same_org_fk,
  DROP COLUMN IF EXISTS public_resource_id;
DROP INDEX IF EXISTS idx_public_views_public_resource_id;

ALTER TABLE customer_request_forms
  DROP CONSTRAINT IF EXISTS customer_request_forms_resource_same_org_fk,
  DROP COLUMN IF EXISTS public_resource_id;
DROP INDEX IF EXISTS idx_customer_request_forms_public_resource_id;

ALTER TABLE roadmaps
  DROP CONSTRAINT IF EXISTS roadmaps_resource_same_org_fk,
  DROP COLUMN IF EXISTS public_resource_id;
DROP INDEX IF EXISTS idx_roadmaps_public_resource_id;

-- 4. Drop public_resources (cascades RLS, indexes, unique constraints)
DROP TABLE IF EXISTS public_resources;

COMMIT;
