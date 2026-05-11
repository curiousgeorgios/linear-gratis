-- contract_fix_d_drop_user_id_from_resources.sql
-- Contract phase for Fix D (ADR 0001). Target release: v0.10.0.
--
-- Prerequisite: every read/write uses created_by. The INSERT policies on the
-- five resource tables still reference user_id; this contract rewrites them
-- to drop the user_id check (org membership is sufficient authority) and
-- then drops the user_id column.
--
-- Grep prerequisite:
--   grep -rE "\\.user_id\\b" src/ | grep -v node_modules
--   # Should return empty (or only intentional auth.uid() references).

BEGIN;

-- 1. Drop sync triggers and function
DROP TRIGGER IF EXISTS public_views_sync_created_by          ON public_views;
DROP TRIGGER IF EXISTS customer_request_forms_sync_created_by ON customer_request_forms;
DROP TRIGGER IF EXISTS branding_settings_sync_created_by      ON branding_settings;
DROP TRIGGER IF EXISTS custom_domains_sync_created_by         ON custom_domains;
DROP TRIGGER IF EXISTS roadmaps_sync_created_by               ON roadmaps;
DROP FUNCTION IF EXISTS sync_user_id_created_by();

-- 2. Rewrite INSERT policies that reference user_id. Replace with org-only
-- authority (the WITH CHECK already verifies org membership; the user_id
-- equality check was redundant defence and is going away).

-- public_views
DROP POLICY IF EXISTS "Members can insert public_views into their orgs" ON public_views;
CREATE POLICY "Members can insert public_views into their orgs" ON public_views
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- customer_request_forms
DROP POLICY IF EXISTS "Members can insert customer_request_forms into their orgs" ON customer_request_forms;
CREATE POLICY "Members can insert customer_request_forms into their orgs" ON customer_request_forms
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- branding_settings
DROP POLICY IF EXISTS "Members can insert branding_settings into their orgs" ON branding_settings;
CREATE POLICY "Members can insert branding_settings into their orgs" ON branding_settings
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- custom_domains
DROP POLICY IF EXISTS "Members can insert custom_domains into their orgs" ON custom_domains;
CREATE POLICY "Members can insert custom_domains into their orgs" ON custom_domains
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- roadmaps
DROP POLICY IF EXISTS "Members can insert roadmaps into their orgs" ON roadmaps;
CREATE POLICY "Members can insert roadmaps into their orgs" ON roadmaps
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- 3. Drop user_id columns. ON DELETE CASCADE on auth.users vanishes with
-- them; created_by remains with ON DELETE SET NULL, which is the correct
-- audit semantic for org-owned resources.

DROP INDEX IF EXISTS idx_public_views_user_id;
DROP INDEX IF EXISTS idx_customer_request_forms_user_id;
DROP INDEX IF EXISTS idx_roadmaps_user_id;

ALTER TABLE public_views          DROP COLUMN user_id;
ALTER TABLE customer_request_forms DROP COLUMN user_id;
ALTER TABLE branding_settings      DROP COLUMN user_id;
ALTER TABLE custom_domains         DROP COLUMN user_id;
ALTER TABLE roadmaps               DROP COLUMN user_id;

COMMIT;
