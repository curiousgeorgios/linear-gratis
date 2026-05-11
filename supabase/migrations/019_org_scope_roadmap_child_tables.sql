-- 019_org_scope_roadmap_child_tables.sql
-- Fix B from ADR 0001: tenancy retrofit for roadmap child tables.
--
-- Migration 015 org-scoped the five primary resource tables but left
-- roadmap_comments and roadmap_votes scoped through roadmaps.user_id. After
-- 015 a teammate invited to an org cannot moderate comments on roadmaps that
-- belong to their org, because the owner-update policy still does
-- `roadmaps.user_id = auth.uid()`. Migration 017 added WITH CHECK to that
-- policy but did not change the authority column.
--
-- This migration:
--   1. Adds organisation_id to roadmap_comments and roadmap_votes, backfilled
--      from the parent roadmaps row.
--   2. Rewrites the owner-scoped policies on roadmap_comments to use org
--      membership.
--   3. Adds a missing DELETE policy on roadmap_comments so moderators can
--      hard-delete (today they could only soft-hide via update).
--   4. Adds NOT NULL + FK ON DELETE CASCADE for tenancy hygiene.
--
-- roadmap_votes gets the column for cascade-delete and future tenant-scoped
-- queries. No new owner RLS policies are added on roadmap_votes because all
-- vote reads/writes go through /api/roadmap/[slug]/vote with supabaseAdmin
-- per migration 017; adding anon-accessible policies would only widen the
-- attack surface.
--
-- The "Anyone can view approved comments" policy is KEPT: it's the public
-- render surface and is legitimately public per the product.
--
-- Drift note: roadmap_comments.organisation_id and roadmap_votes.organisation_id
-- are denormalised from roadmaps.organisation_id. Roadmaps cannot be moved
-- between orgs today (no UI or API path), so drift is impossible. If that
-- changes, add a trigger that keeps the child rows in sync.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. roadmap_comments.organisation_id
-- -----------------------------------------------------------------------------

-- Enables composite FKs from roadmap child tables so a child row's
-- organisation_id must match the parent roadmap's organisation_id.
ALTER TABLE roadmaps
  ADD CONSTRAINT roadmaps_organisation_id_id_unique UNIQUE (organisation_id, id);

ALTER TABLE roadmap_comments
  ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  ADD CONSTRAINT roadmap_comments_same_org_roadmap_fk
    FOREIGN KEY (organisation_id, roadmap_id)
    REFERENCES roadmaps(organisation_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

UPDATE roadmap_comments c
SET organisation_id = r.organisation_id
FROM roadmaps r
WHERE r.id = c.roadmap_id;

DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM roadmap_comments WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'roadmap_comments has % rows with null organisation_id after backfill', orphan_count;
  END IF;
END $$;

ALTER TABLE roadmap_comments ALTER COLUMN organisation_id SET NOT NULL;
CREATE INDEX idx_roadmap_comments_organisation_id ON roadmap_comments(organisation_id);

-- -----------------------------------------------------------------------------
-- 2. roadmap_votes.organisation_id
-- -----------------------------------------------------------------------------

ALTER TABLE roadmap_votes
  ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE,
  ADD CONSTRAINT roadmap_votes_same_org_roadmap_fk
    FOREIGN KEY (organisation_id, roadmap_id)
    REFERENCES roadmaps(organisation_id, id)
    ON UPDATE CASCADE
    ON DELETE CASCADE;

UPDATE roadmap_votes v
SET organisation_id = r.organisation_id
FROM roadmaps r
WHERE r.id = v.roadmap_id;

DO $$
DECLARE
  orphan_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM roadmap_votes WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN
    RAISE EXCEPTION 'roadmap_votes has % rows with null organisation_id after backfill', orphan_count;
  END IF;
END $$;

ALTER TABLE roadmap_votes ALTER COLUMN organisation_id SET NOT NULL;
CREATE INDEX idx_roadmap_votes_organisation_id ON roadmap_votes(organisation_id);

-- -----------------------------------------------------------------------------
-- 3. Rewrite owner-scoped RLS on roadmap_comments using org membership
-- -----------------------------------------------------------------------------

DROP POLICY IF EXISTS "Owners can view all comments" ON roadmap_comments;
DROP POLICY IF EXISTS "Owners can update comments"   ON roadmap_comments;

CREATE POLICY "Org members can view all comments on org roadmaps" ON roadmap_comments
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can moderate comments on org roadmaps" ON roadmap_comments
  FOR UPDATE
  USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  )
  WITH CHECK (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Org members can delete comments on org roadmaps" ON roadmap_comments
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- The public "Anyone can view approved comments" policy is KEPT unchanged.

COMMIT;
