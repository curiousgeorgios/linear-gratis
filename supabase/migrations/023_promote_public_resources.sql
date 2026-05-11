-- 023_promote_public_resources.sql
-- Fix F from ADR 0001: promote public_resources to a real table and enforce
-- cross-type slug uniqueness in the public URL namespace.
--
-- Background: three resource tables (public_views, customer_request_forms,
-- roadmaps) share the same publishable shape: org-owned, slug-routable,
-- password-protectable, expiry-gated, brandable, custom-domain-able. Today
-- each enforces slug uniqueness independently, which means `/view/foo`,
-- `/form/foo` and `/roadmap/foo` can all coexist (Decision 2 in ADR 0001
-- forbids this).
--
-- Design (per ADR 0001):
--   - public_resources is the canonical publishable entity. The three
--     resource tables become extension tables that reference it.
--   - public_resources.slug has a single global UNIQUE constraint. Cross-
--     type collisions are a schema-level impossibility.
--   - UNIQUE (organisation_id, id) enables a composite FK from extension
--     tables that enforces same-org consistency.
--   - Each resource table gains a public_resource_id column with a
--     composite FK back to public_resources, ON DELETE CASCADE.
--
-- Expand-only: the existing shared columns on the resource tables
-- (slug, is_active, password_hash, expires_at) are KEPT for now. A
-- BEFORE INSERT trigger on each resource table creates the public_resources
-- row before the insert lands so the composite FK is satisfied. AFTER
-- UPDATE/DELETE triggers maintain the public_resources row. The contract
-- migration drops the duplicated columns once application reads have moved.
--
-- Slug-conflict pre-flight: this migration aborts if any slug appears in
-- more than one of the three resource tables. The codebase has only ever
-- enforced per-table uniqueness, so such conflicts are theoretically
-- possible. Fix any reported collisions before re-running.
--
-- Contract date target: v0.12.0.

BEGIN;

-- -----------------------------------------------------------------------------
-- 0. Pre-flight: abort on cross-type slug collisions
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  collision_count INT;
  collisions TEXT;
BEGIN
  SELECT COUNT(*), string_agg(slug || ' (' || sources || ')', ', ')
    INTO collision_count, collisions
  FROM (
    SELECT slug, string_agg(source, ',') AS sources
    FROM (
      SELECT slug, 'view' AS source FROM public_views
      UNION ALL
      SELECT slug, 'form' AS source FROM customer_request_forms
      UNION ALL
      SELECT slug, 'roadmap' AS source FROM roadmaps
    ) s
    GROUP BY slug
    HAVING COUNT(*) > 1
  ) c;

  IF collision_count > 0 THEN
    RAISE EXCEPTION 'cannot promote public_resources: % cross-type slug collision(s) detected: %', collision_count, collisions;
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 1. public_resources table
-- -----------------------------------------------------------------------------

CREATE TABLE public_resources (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type                  TEXT NOT NULL CHECK (type IN ('view', 'form', 'roadmap')),
  organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  slug                  TEXT NOT NULL UNIQUE,                                       -- cross-type unique
  password_hash         TEXT,
  expires_at            TIMESTAMPTZ,
  is_active             BOOLEAN NOT NULL DEFAULT true,
  created_by            UUID REFERENCES profiles(id) ON DELETE SET NULL,
  linear_connection_id  UUID,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Enables composite FK from extension tables: (org_id, resource_id) must
  -- exist as a row here.
  UNIQUE (organisation_id, id),

  -- Same composite-FK trick for the Linear connection: a resource may only
  -- reference a Linear connection in its own org.
  FOREIGN KEY (organisation_id, linear_connection_id)
    REFERENCES organisation_linear_connections(organisation_id, id)
    ON DELETE RESTRICT
);

CREATE INDEX idx_public_resources_organisation_id ON public_resources(organisation_id);
CREATE INDEX idx_public_resources_type            ON public_resources(type);
CREATE INDEX idx_public_resources_created_by      ON public_resources(created_by);
CREATE INDEX idx_public_resources_linear_conn_id  ON public_resources(linear_connection_id);

-- Supabase grants table-wide SELECT on new public-schema tables to anon and
-- authenticated by default. public_resources deliberately carries
-- password_hash for server-side access checks, so only grant direct clients the
-- non-secret routing columns. Server-side service-role access is unaffected.
REVOKE SELECT ON public_resources FROM anon, authenticated;
GRANT SELECT (
  id,
  type,
  organisation_id,
  slug,
  expires_at,
  is_active,
  created_by,
  linear_connection_id,
  created_at,
  updated_at
) ON public_resources TO anon, authenticated;

ALTER TABLE public_resources ENABLE ROW LEVEL SECURITY;

-- Public surface: read by anyone for slug-based routing and visibility checks.
-- Column-level grants above prevent direct clients from selecting password_hash.
CREATE POLICY "Anyone can view active public_resources" ON public_resources
  FOR SELECT USING (is_active = true);

-- Members of the org can view their own resources (inactive included).
CREATE POLICY "Org members can view their public_resources" ON public_resources
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- Members can insert / update / delete their org's resources.
-- The extension-table BEFORE INSERT triggers populate this on behalf of the
-- application, so the application never inserts directly. Policies exist for
-- defence in depth and future direct-write code paths.
CREATE POLICY "Org members can insert public_resources" ON public_resources
  FOR INSERT WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can update public_resources" ON public_resources
  FOR UPDATE
  USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can delete public_resources" ON public_resources
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE TRIGGER on_public_resources_updated
  BEFORE UPDATE ON public_resources
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Add public_resource_id to the three extension tables, with composite FK
-- -----------------------------------------------------------------------------

ALTER TABLE public_views
  ADD COLUMN public_resource_id UUID,
  ADD CONSTRAINT public_views_resource_same_org_fk
    FOREIGN KEY (organisation_id, public_resource_id)
    REFERENCES public_resources(organisation_id, id)
    ON DELETE CASCADE;
CREATE INDEX idx_public_views_public_resource_id ON public_views(public_resource_id);

ALTER TABLE customer_request_forms
  ADD COLUMN public_resource_id UUID,
  ADD CONSTRAINT customer_request_forms_resource_same_org_fk
    FOREIGN KEY (organisation_id, public_resource_id)
    REFERENCES public_resources(organisation_id, id)
    ON DELETE CASCADE;
CREATE INDEX idx_customer_request_forms_public_resource_id ON customer_request_forms(public_resource_id);

ALTER TABLE roadmaps
  ADD COLUMN public_resource_id UUID,
  ADD CONSTRAINT roadmaps_resource_same_org_fk
    FOREIGN KEY (organisation_id, public_resource_id)
    REFERENCES public_resources(organisation_id, id)
    ON DELETE CASCADE;
CREATE INDEX idx_roadmaps_public_resource_id ON roadmaps(public_resource_id);

-- -----------------------------------------------------------------------------
-- 3. Backfill: one public_resources row per existing resource row.
--    Order matters: views first, then forms, then roadmaps. The UNIQUE on
--    public_resources.slug will fail if any cross-type collisions slipped
--    past the pre-flight (defence in depth).
-- -----------------------------------------------------------------------------

WITH inserted AS (
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at)
  SELECT
    'view', organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at
  FROM public_views
  RETURNING id, slug, organisation_id
)
UPDATE public_views v
SET public_resource_id = i.id
FROM inserted i
WHERE i.slug = v.slug AND i.organisation_id = v.organisation_id;

WITH inserted AS (
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at)
  SELECT
    'form',
    organisation_id,
    slug,
    NULL,                                                       -- forms don't have password_hash on the table
    NULL,                                                       -- forms don't have expires_at either
    is_active,
    created_by,
    linear_connection_id,
    created_at,
    updated_at
  FROM customer_request_forms
  RETURNING id, slug, organisation_id
)
UPDATE customer_request_forms f
SET public_resource_id = i.id
FROM inserted i
WHERE i.slug = f.slug AND i.organisation_id = f.organisation_id;

WITH inserted AS (
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at)
  SELECT
    'roadmap', organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at
  FROM roadmaps
  RETURNING id, slug, organisation_id
)
UPDATE roadmaps r
SET public_resource_id = i.id
FROM inserted i
WHERE i.slug = r.slug AND i.organisation_id = r.organisation_id;

-- Assert every extension row has a public_resource_id
DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public_views          WHERE public_resource_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'public_views has % rows with null public_resource_id after backfill', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM customer_request_forms WHERE public_resource_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'customer_request_forms has % rows with null public_resource_id after backfill', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM roadmaps               WHERE public_resource_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'roadmaps has % rows with null public_resource_id after backfill', orphan_count; END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 4. BEFORE INSERT triggers: each extension row creates a public_resources
--    row first and copies its id into public_resource_id. This is what
--    enforces cross-type slug uniqueness at write time and keeps the FK
--    satisfied.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION create_public_resource_for_view()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NEW.public_resource_id IS NOT NULL THEN
    RETURN NEW;  -- caller already populated; assume they know what they're doing
  END IF;
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id)
  VALUES
    ('view', NEW.organisation_id, NEW.slug, NEW.password_hash, NEW.expires_at, NEW.is_active, NEW.created_by, NEW.linear_connection_id)
  RETURNING id INTO new_id;
  NEW.public_resource_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_public_resource_for_form()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NEW.public_resource_id IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id)
  VALUES
    ('form', NEW.organisation_id, NEW.slug, NULL, NULL, NEW.is_active, NEW.created_by, NEW.linear_connection_id)
  RETURNING id INTO new_id;
  NEW.public_resource_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_public_resource_for_roadmap()
RETURNS TRIGGER AS $$
DECLARE
  new_id UUID;
BEGIN
  IF NEW.public_resource_id IS NOT NULL THEN RETURN NEW; END IF;
  INSERT INTO public_resources
    (type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id)
  VALUES
    ('roadmap', NEW.organisation_id, NEW.slug, NEW.password_hash, NEW.expires_at, NEW.is_active, NEW.created_by, NEW.linear_connection_id)
  RETURNING id INTO new_id;
  NEW.public_resource_id := new_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger names are prefixed with `z_` so they fire alphabetically AFTER the
-- BEFORE INSERT sync triggers from migrations 020 (linear IDs) and 021
-- (user_id ↔ created_by). Without this ordering the create trigger would
-- read NULL for NEW.created_by and NEW.linear_project_id and the
-- public_resources mirror would be stale until the next UPDATE.

CREATE TRIGGER z_public_views_create_public_resource
  BEFORE INSERT ON public_views
  FOR EACH ROW EXECUTE FUNCTION create_public_resource_for_view();

CREATE TRIGGER z_customer_request_forms_create_public_resource
  BEFORE INSERT ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION create_public_resource_for_form();

CREATE TRIGGER z_roadmaps_create_public_resource
  BEFORE INSERT ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION create_public_resource_for_roadmap();

-- -----------------------------------------------------------------------------
-- 5. AFTER UPDATE triggers: keep public_resources in sync when shared
--    columns change on extension tables.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_public_resource_from_view()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public_resources
     SET slug                 = NEW.slug,
         password_hash        = NEW.password_hash,
         expires_at           = NEW.expires_at,
         is_active            = NEW.is_active,
         created_by           = NEW.created_by,
         linear_connection_id = NEW.linear_connection_id,
         updated_at           = NOW()
   WHERE id = NEW.public_resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_public_resource_from_form()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public_resources
     SET slug                 = NEW.slug,
         is_active            = NEW.is_active,
         created_by           = NEW.created_by,
         linear_connection_id = NEW.linear_connection_id,
         updated_at           = NOW()
   WHERE id = NEW.public_resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_public_resource_from_roadmap()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public_resources
     SET slug                 = NEW.slug,
         password_hash        = NEW.password_hash,
         expires_at           = NEW.expires_at,
         is_active            = NEW.is_active,
         created_by           = NEW.created_by,
         linear_connection_id = NEW.linear_connection_id,
         updated_at           = NOW()
   WHERE id = NEW.public_resource_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- AFTER UPDATE triggers fire after all BEFORE UPDATE syncs from earlier
-- migrations, so trigger name ordering is not load-bearing here.

CREATE TRIGGER public_views_sync_public_resource
  AFTER UPDATE ON public_views
  FOR EACH ROW EXECUTE FUNCTION sync_public_resource_from_view();

CREATE TRIGGER customer_request_forms_sync_public_resource
  AFTER UPDATE ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION sync_public_resource_from_form();

CREATE TRIGGER roadmaps_sync_public_resource
  AFTER UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION sync_public_resource_from_roadmap();

-- Note: AFTER DELETE on extension tables is NOT a trigger here. The composite
-- FK is `(organisation_id, public_resource_id) REFERENCES public_resources
-- (organisation_id, id) ON DELETE CASCADE`. That cascade is parent → child
-- (public_resources → extension), not the direction we want. To delete the
-- public_resources row when an extension row is deleted, add this trigger:

CREATE OR REPLACE FUNCTION delete_public_resource_for_extension()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public_resources WHERE id = OLD.public_resource_id;
  RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_views_delete_public_resource
  AFTER DELETE ON public_views
  FOR EACH ROW EXECUTE FUNCTION delete_public_resource_for_extension();

CREATE TRIGGER customer_request_forms_delete_public_resource
  AFTER DELETE ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION delete_public_resource_for_extension();

CREATE TRIGGER roadmaps_delete_public_resource
  AFTER DELETE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION delete_public_resource_for_extension();

-- -----------------------------------------------------------------------------
-- 6. Now make public_resource_id NOT NULL on the extension tables: every
--    row has it after backfill, and the BEFORE INSERT trigger guarantees it
--    for new rows.
-- -----------------------------------------------------------------------------

ALTER TABLE public_views          ALTER COLUMN public_resource_id SET NOT NULL;
ALTER TABLE customer_request_forms ALTER COLUMN public_resource_id SET NOT NULL;
ALTER TABLE roadmaps               ALTER COLUMN public_resource_id SET NOT NULL;

COMMIT;
