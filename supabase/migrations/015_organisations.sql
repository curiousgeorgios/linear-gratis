-- 015_organisations.sql
-- Introduce organisations + memberships as the access-control boundary.
-- Closes the cross-tenant read leak introduced by migration 011.
-- Single transaction: Supabase migrations run in an implicit BEGIN/COMMIT.

-- -----------------------------------------------------------------------------
-- 1. Schema
-- -----------------------------------------------------------------------------

CREATE TYPE org_role AS ENUM ('owner', 'member');

CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orgs_created_by ON organisations(created_by);

CREATE TABLE organisation_members (
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);
CREATE INDEX idx_org_members_user ON organisation_members(user_id);

-- updated_at trigger reuse: the handle_updated_at function exists from migration 001
CREATE TRIGGER on_organisations_updated
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Add nullable organisation_id to each resource table (populated in section 4)
-- -----------------------------------------------------------------------------

ALTER TABLE public_views          ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE customer_request_forms ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE branding_settings      ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE custom_domains         ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE roadmaps               ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

CREATE INDEX idx_public_views_organisation_id          ON public_views(organisation_id);
CREATE INDEX idx_customer_request_forms_organisation_id ON customer_request_forms(organisation_id);
CREATE INDEX idx_branding_settings_organisation_id      ON branding_settings(organisation_id);
CREATE INDEX idx_custom_domains_organisation_id         ON custom_domains(organisation_id);
CREATE INDEX idx_roadmaps_organisation_id               ON roadmaps(organisation_id);

-- -----------------------------------------------------------------------------
-- 3. Seed: one personal organisation per existing profile, user as owner
-- -----------------------------------------------------------------------------

INSERT INTO organisations (name, slug, created_by)
SELECT
  COALESCE(NULLIF(split_part(email, '@', 1), ''), 'workspace') || '''s workspace',
  'u-' || replace(id::text, '-', ''),
  id
FROM profiles;

INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT id, created_by, 'owner'::org_role FROM organisations;

-- -----------------------------------------------------------------------------
-- 4. Backfill: stamp every existing resource row with its owner's org id
-- -----------------------------------------------------------------------------

UPDATE public_views          v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE customer_request_forms v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE branding_settings      v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE custom_domains         v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE roadmaps               v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;

-- -----------------------------------------------------------------------------
-- 5. Assertions: every resource row must have a non-null organisation_id
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  orphan_count INT;
  profile_count INT;
  org_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public_views          WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'public_views has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM customer_request_forms WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'customer_request_forms has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM branding_settings      WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'branding_settings has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM custom_domains         WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'custom_domains has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM roadmaps               WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'roadmaps has % orphan rows', orphan_count; END IF;

  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO org_count     FROM organisations;
  IF org_count < profile_count THEN
    RAISE EXCEPTION 'expected >= % orgs (one per profile), found %', profile_count, org_count;
  END IF;

  -- Every org must have at least one owner. Protects against a silently-broken
  -- seed (e.g. if section 3's second INSERT ever regresses).
  IF (SELECT COUNT(DISTINCT organisation_id) FROM organisation_members WHERE role = 'owner') < org_count THEN
    RAISE EXCEPTION 'expected every org to have >= 1 owner, found % org(s) without an owner',
      org_count - (SELECT COUNT(DISTINCT organisation_id) FROM organisation_members WHERE role = 'owner');
  END IF;
END $$;

-- -----------------------------------------------------------------------------
-- 6. Enforce NOT NULL now that all rows are populated
-- -----------------------------------------------------------------------------

ALTER TABLE public_views          ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE customer_request_forms ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE branding_settings      ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE custom_domains         ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE roadmaps               ALTER COLUMN organisation_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- 7. Drop every pre-existing policy on the five resource tables by exact name
-- -----------------------------------------------------------------------------

-- public_views (from migrations 003, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all public_views" ON public_views;
DROP POLICY IF EXISTS "Users can view own public_views"               ON public_views;
DROP POLICY IF EXISTS "Users can insert own public_views"             ON public_views;
DROP POLICY IF EXISTS "Users can update own public_views"             ON public_views;
DROP POLICY IF EXISTS "Users can delete own public_views"             ON public_views;

-- customer_request_forms (from migrations 002, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all forms"        ON customer_request_forms;
DROP POLICY IF EXISTS "Users can view own forms"                      ON customer_request_forms;
DROP POLICY IF EXISTS "Users can insert own forms"                    ON customer_request_forms;
DROP POLICY IF EXISTS "Users can update own forms"                    ON customer_request_forms;
DROP POLICY IF EXISTS "Users can delete own forms"                    ON customer_request_forms;
-- DELIBERATELY KEPT: "Anyone can view active forms for submission"   (needed for public submit)

-- branding_settings (from migrations 005, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all branding settings" ON branding_settings;
DROP POLICY IF EXISTS "Users can view own branding settings"          ON branding_settings;
DROP POLICY IF EXISTS "Users can insert own branding settings"        ON branding_settings;
DROP POLICY IF EXISTS "Users can update own branding settings"        ON branding_settings;
DROP POLICY IF EXISTS "Users can delete own branding settings"        ON branding_settings;
-- DELIBERATELY KEPT: "Anyone can view branding settings for public access" (needed for public render)

-- custom_domains (from migrations 007, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all custom domains" ON custom_domains;
DROP POLICY IF EXISTS "Users can view own custom domains"             ON custom_domains;
DROP POLICY IF EXISTS "Users can insert own custom domains"           ON custom_domains;
DROP POLICY IF EXISTS "Users can update own custom domains"           ON custom_domains;
DROP POLICY IF EXISTS "Users can delete own custom domains"           ON custom_domains;
-- DELIBERATELY KEPT: "Anyone can view verified active custom domains" (needed for hostname routing)

-- roadmaps (from migrations 010, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all roadmaps"     ON roadmaps;
DROP POLICY IF EXISTS "Users can view own roadmaps"                   ON roadmaps;
DROP POLICY IF EXISTS "Users can insert own roadmaps"                 ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps"                 ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps"                 ON roadmaps;

-- -----------------------------------------------------------------------------
-- 8. New member-scoped policies on the five resource tables
-- -----------------------------------------------------------------------------

-- public_views
CREATE POLICY "Members can view public_views in their orgs" ON public_views
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert public_views into their orgs" ON public_views
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update public_views in their orgs" ON public_views
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete public_views in their orgs" ON public_views
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- customer_request_forms
CREATE POLICY "Members can view customer_request_forms in their orgs" ON customer_request_forms
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert customer_request_forms into their orgs" ON customer_request_forms
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update customer_request_forms in their orgs" ON customer_request_forms
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete customer_request_forms in their orgs" ON customer_request_forms
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- branding_settings
CREATE POLICY "Members can view branding_settings in their orgs" ON branding_settings
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert branding_settings into their orgs" ON branding_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update branding_settings in their orgs" ON branding_settings
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete branding_settings in their orgs" ON branding_settings
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- custom_domains
CREATE POLICY "Members can view custom_domains in their orgs" ON custom_domains
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert custom_domains into their orgs" ON custom_domains
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update custom_domains in their orgs" ON custom_domains
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete custom_domains in their orgs" ON custom_domains
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- roadmaps
CREATE POLICY "Members can view roadmaps in their orgs" ON roadmaps
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert roadmaps into their orgs" ON roadmaps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update roadmaps in their orgs" ON roadmaps
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete roadmaps in their orgs" ON roadmaps
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 9. RLS on the new tables
-- -----------------------------------------------------------------------------

ALTER TABLE organisations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- organisations: members can read; only owners can update / delete; any authenticated user can create (claiming created_by = self)
CREATE POLICY "Members can view their orgs" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orgs" ON organisations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their orgs" ON organisations
  FOR UPDATE
  USING (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their orgs" ON organisations
  FOR DELETE USING (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- organisation_members: members can see co-members.
-- INSERT/UPDATE/DELETE: intentionally no Phase 1 policies. Memberships are only created by
-- (a) the seed block above, (b) the handle_new_user trigger below, both SECURITY DEFINER.
-- Phase 2 adds owner-only invite/remove policies.
CREATE POLICY "Members can view co-members" ON organisation_members
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- -----------------------------------------------------------------------------
-- 10. Replace handle_new_user: every new auth user gets a personal org + owner row
-- CREATE OR REPLACE FUNCTION preserves the on_auth_user_created trigger (migration 001).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);

  INSERT INTO public.organisations (id, name, slug, created_by)
  VALUES (
    new_org_id,
    COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'workspace') || '''s workspace',
    'u-' || replace(new_org_id::text, '-', ''),
    NEW.id
  );

  INSERT INTO public.organisation_members (organisation_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
