-- 019_org_scope_roadmap_child_tables_rollback.sql
-- Manual rollback for 019. NOT tracked as a migration; lives under
-- supabase/rollbacks/ per the README in this directory.
--
-- Reinstates the pre-019 RLS state (creator-scoped via roadmaps.user_id) and
-- drops the org_id columns + indexes added by 019.
--
-- Run only after reverting application code to a commit from before 019
-- shipped. Org members other than the original creator will lose moderation
-- access after this rollback.

BEGIN;

-- 1. Drop new policies
DROP POLICY IF EXISTS "Org members can view all comments on org roadmaps"     ON roadmap_comments;
DROP POLICY IF EXISTS "Org members can moderate comments on org roadmaps"    ON roadmap_comments;
DROP POLICY IF EXISTS "Org members can delete comments on org roadmaps"      ON roadmap_comments;

-- 2. Reinstate the pre-019 creator-scoped policies (from migrations 010 + 017)
CREATE POLICY "Owners can view all comments" ON roadmap_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
  );

CREATE POLICY "Owners can update comments" ON roadmap_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
  );

-- 3. Drop the organisation_id columns
DROP INDEX IF EXISTS idx_roadmap_comments_organisation_id;
DROP INDEX IF EXISTS idx_roadmap_votes_organisation_id;

ALTER TABLE roadmap_comments
  DROP CONSTRAINT IF EXISTS roadmap_comments_same_org_roadmap_fk,
  DROP COLUMN organisation_id;
ALTER TABLE roadmap_votes
  DROP CONSTRAINT IF EXISTS roadmap_votes_same_org_roadmap_fk,
  DROP COLUMN organisation_id;

ALTER TABLE roadmaps
  DROP CONSTRAINT IF EXISTS roadmaps_organisation_id_id_unique;

COMMIT;
