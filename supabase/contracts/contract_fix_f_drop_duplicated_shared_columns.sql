-- contract_fix_f_drop_duplicated_shared_columns.sql
-- Contract phase for Fix F (ADR 0001). Target release: v0.12.0.
--
-- Prerequisite: every slug-routing path in the application reads through
-- public_resources first, then fetches the extension row by public_resource_id.
-- The shared columns (slug, password_hash, expires_at, is_active) live ONLY
-- on public_resources after this contract; the extension tables hold only
-- type-specific columns.
--
-- This is the biggest contract by blast radius. Recommended app-layer
-- prerequisites:
--
--   1. roadmap-auth.ts, public-view-auth.ts → use requirePublicAccess() from
--      public-resource.ts instead of per-table SELECTs.
--   2. List endpoints (/api/roadmaps GET, /forms, /views pages) → JOIN
--      public_resources for slug/is_active or query public_resources first.
--   3. Custom-domain routing → already keyed by public_custom_domain_routes
--      view in migration 018; verify target_slug resolves via public_resources.
--
-- Grep prerequisites:
--   grep -rE "\\.slug\\b|\\.password_hash\\b|\\.expires_at\\b|\\.is_active\\b" src/ \
--     | grep -E "public_views|customer_request_forms|roadmaps"
--   # Should be empty for SELECT projections that pick these from the extension.

BEGIN;

-- 1. Drop AFTER UPDATE sync triggers on extension tables
DROP TRIGGER IF EXISTS public_views_sync_public_resource           ON public_views;
DROP TRIGGER IF EXISTS customer_request_forms_sync_public_resource ON customer_request_forms;
DROP TRIGGER IF EXISTS roadmaps_sync_public_resource               ON roadmaps;
DROP FUNCTION IF EXISTS sync_public_resource_from_view();
DROP FUNCTION IF EXISTS sync_public_resource_from_form();
DROP FUNCTION IF EXISTS sync_public_resource_from_roadmap();

-- 2. Drop the BEFORE INSERT convenience triggers. After the contract,
-- application code must insert public_resources first (with slug,
-- password_hash, expires_at and is_active), then insert the extension table row
-- with the returned public_resource_id. A trigger cannot safely synthesize a
-- real public_resources row once the extension tables no longer carry slug.

DROP TRIGGER IF EXISTS z_public_views_create_public_resource           ON public_views;
DROP TRIGGER IF EXISTS z_customer_request_forms_create_public_resource ON customer_request_forms;
DROP TRIGGER IF EXISTS z_roadmaps_create_public_resource               ON roadmaps;
DROP FUNCTION IF EXISTS create_public_resource_for_view();
DROP FUNCTION IF EXISTS create_public_resource_for_form();
DROP FUNCTION IF EXISTS create_public_resource_for_roadmap();

-- 3. Keep the AFTER DELETE triggers. They only delete public_resources by
-- public_resource_id and do not depend on the shared columns being removed.

-- 4. Drop duplicated columns from extension tables.

DROP INDEX IF EXISTS idx_public_views_slug;
DROP INDEX IF EXISTS idx_customer_request_forms_slug;
DROP INDEX IF EXISTS idx_roadmaps_slug;
DROP INDEX IF EXISTS idx_public_views_active;
DROP INDEX IF EXISTS idx_roadmaps_active;

ALTER TABLE public_views
  DROP COLUMN slug,
  DROP COLUMN password_hash,
  DROP COLUMN password_protected,
  DROP COLUMN expires_at,
  DROP COLUMN is_active;

ALTER TABLE customer_request_forms
  DROP COLUMN slug,
  DROP COLUMN is_active;

ALTER TABLE roadmaps
  DROP COLUMN slug,
  DROP COLUMN password_hash,
  DROP COLUMN password_protected,
  DROP COLUMN expires_at,
  DROP COLUMN is_active;

COMMIT;
