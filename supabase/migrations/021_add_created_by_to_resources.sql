-- 021_add_created_by_to_resources.sql
-- Fix D from ADR 0001: rename user_id to created_by on resource tables and
-- migrate the FK target from auth.users to profiles.
--
-- The five resource tables (public_views, customer_request_forms,
-- branding_settings, custom_domains, roadmaps) each carry a `user_id` that
-- has been doing three jobs since migration 015: audit trail, FK to
-- auth.users, and the residual `user_id = auth.uid()` guard in INSERT RLS.
-- The first job is the only one we still want.
--
-- This migration adds `created_by UUID NULL REFERENCES profiles(id) ON
-- DELETE SET NULL` alongside `user_id` and keeps them in sync via triggers.
-- The contract migration drops `user_id` and rewrites the INSERT policies
-- to drop the `user_id = auth.uid()` guard (org membership is sufficient).
--
-- Why ON DELETE SET NULL: a resource belongs to an organisation, not to a
-- person. When the original creator's auth row is purged, the resource
-- should remain in the org, just with a null audit trail. Today user_id's
-- ON DELETE CASCADE still applies during the dual-write window, so the
-- legacy behaviour is preserved until the contract.
--
-- Why REFERENCES profiles(id) instead of auth.users(id): this aligns the
-- five resource tables with organisations.created_by (also profiles(id))
-- and makes profiles the single canonical identity table for application
-- code. The values are identical UUIDs in both targets because
-- profiles.id = auth.users.id by construction.
--
-- Contract date target: v0.10.0.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. Add created_by, backfill, then index for parity with the user_id indexes
-- -----------------------------------------------------------------------------

ALTER TABLE public_views
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
UPDATE public_views SET created_by = user_id;
CREATE INDEX idx_public_views_created_by ON public_views(created_by);

ALTER TABLE customer_request_forms
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
UPDATE customer_request_forms SET created_by = user_id;
CREATE INDEX idx_customer_request_forms_created_by ON customer_request_forms(created_by);

ALTER TABLE branding_settings
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
UPDATE branding_settings SET created_by = user_id;
CREATE INDEX idx_branding_settings_created_by ON branding_settings(created_by);

ALTER TABLE custom_domains
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
UPDATE custom_domains SET created_by = user_id;
CREATE INDEX idx_custom_domains_created_by ON custom_domains(created_by);

ALTER TABLE roadmaps
  ADD COLUMN created_by UUID REFERENCES profiles(id) ON DELETE SET NULL;
UPDATE roadmaps SET created_by = user_id;
CREATE INDEX idx_roadmaps_created_by ON roadmaps(created_by);

-- -----------------------------------------------------------------------------
-- 2. Generic sync function: keep user_id and created_by aligned during the
--    dual-write window. Both columns point at the same UUID by construction
--    (profiles.id = auth.users.id). One generic function covers all five
--    tables since the column shape is identical.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_user_id_created_by()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    NEW.created_by := COALESCE(NEW.created_by, NEW.user_id);
    NEW.user_id    := COALESCE(NEW.user_id,    NEW.created_by);
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.created_by IS DISTINCT FROM OLD.created_by THEN
      NEW.user_id := NEW.created_by;
    ELSIF NEW.user_id IS DISTINCT FROM OLD.user_id THEN
      NEW.created_by := NEW.user_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_views_sync_created_by
  BEFORE INSERT OR UPDATE ON public_views
  FOR EACH ROW EXECUTE FUNCTION sync_user_id_created_by();

CREATE TRIGGER customer_request_forms_sync_created_by
  BEFORE INSERT OR UPDATE ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION sync_user_id_created_by();

CREATE TRIGGER branding_settings_sync_created_by
  BEFORE INSERT OR UPDATE ON branding_settings
  FOR EACH ROW EXECUTE FUNCTION sync_user_id_created_by();

CREATE TRIGGER custom_domains_sync_created_by
  BEFORE INSERT OR UPDATE ON custom_domains
  FOR EACH ROW EXECUTE FUNCTION sync_user_id_created_by();

CREATE TRIGGER roadmaps_sync_created_by
  BEFORE INSERT OR UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION sync_user_id_created_by();

-- -----------------------------------------------------------------------------
-- 3. Backfill assertion: every row must have created_by populated, since
--    user_id was NOT NULL on all five tables.
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public_views          WHERE created_by IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'public_views has % rows with null created_by', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM customer_request_forms WHERE created_by IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'customer_request_forms has % rows with null created_by', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM branding_settings      WHERE created_by IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'branding_settings has % rows with null created_by', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM custom_domains         WHERE created_by IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'custom_domains has % rows with null created_by', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM roadmaps               WHERE created_by IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'roadmaps has % rows with null created_by', orphan_count; END IF;
END $$;

COMMIT;
