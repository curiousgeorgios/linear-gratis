-- 017_lockdown_roadmap_writes_and_profile_check.sql
-- Tighten four RLS gaps surfaced by the post-015 bug hunt.
--
-- Finding 5: roadmap_votes had `"Anyone can delete votes" USING (true)`, which
-- let any anon client delete every vote via the public anon key. All vote
-- writes go through /api/roadmap/[slug]/vote which uses supabaseAdmin, so the
-- anon-accessible policies are unnecessary. Drop all three anon policies on
-- roadmap_votes (view, insert, delete); keep RLS enabled.
--
-- Finding 6: roadmap_comments had `"Anyone can insert comments" WITH CHECK (true)`,
-- which let anon clients bypass the moderate_comments setting by inserting
-- with is_approved = true and is_hidden = false directly. All comment writes
-- go through /api/roadmap/[slug]/comments which uses supabaseAdmin. Drop the
-- permissive anon insert policy; keep the anon-view-approved-comments policy
-- for rendering, since comments feeds are legitimately public.
--
-- Finding 7: Add WITH CHECK to the "Owners can update comments" policy so an
-- authenticated owner can't update a comment's roadmap_id to point at a
-- roadmap they don't own.
--
-- Finding 12: Add WITH CHECK to "Users can update own profile" on profiles
-- for consistency with migration 012 and defence in depth, even though the
-- FK to auth.users prevents the obvious exploit.

BEGIN;

-- Finding 5: lock down roadmap_votes writes
DROP POLICY IF EXISTS "Anyone can view votes"   ON roadmap_votes;
DROP POLICY IF EXISTS "Anyone can insert votes" ON roadmap_votes;
DROP POLICY IF EXISTS "Anyone can delete votes" ON roadmap_votes;
-- No new policies: roadmap_votes is now only mutated via supabaseAdmin from
-- API routes. RLS stays enabled so any stray anon client attempt fails closed.

-- Finding 6: lock down roadmap_comments writes; keep the read policy for
-- approved, non-hidden comments since they are legitimately public product data.
DROP POLICY IF EXISTS "Anyone can insert comments" ON roadmap_comments;
-- Keep: "Anyone can view approved comments"

-- Finding 7: add WITH CHECK to owner update so roadmap_id can't be retargeted
DROP POLICY IF EXISTS "Owners can update comments" ON roadmap_comments;
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

-- Finding 12: add WITH CHECK to profile update
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

COMMIT;
