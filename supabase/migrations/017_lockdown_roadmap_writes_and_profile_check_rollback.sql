-- 017_lockdown_roadmap_writes_and_profile_check_rollback.sql
-- Manual rollback for 017. NOT tracked as a migration.
--
-- IMPORTANT: Before running this rollback, make sure no client code has been
-- written to assume the direct-to-Supabase anon write path is closed. If any
-- UI was added between 017 and the rollback that uses supabaseAdmin-only API
-- routes, running this rollback re-opens the write path but the routes keep
-- working.

BEGIN;

-- Finding 5 reverse
CREATE POLICY "Anyone can view votes"   ON roadmap_votes FOR SELECT USING (true);
CREATE POLICY "Anyone can insert votes" ON roadmap_votes FOR INSERT WITH CHECK (true);
CREATE POLICY "Anyone can delete votes" ON roadmap_votes FOR DELETE USING (true);

-- Finding 6 reverse
CREATE POLICY "Anyone can insert comments" ON roadmap_comments FOR INSERT WITH CHECK (true);

-- Finding 7 reverse (drop WITH CHECK variant, reinstate USING only)
DROP POLICY IF EXISTS "Owners can update comments" ON roadmap_comments;
CREATE POLICY "Owners can update comments" ON roadmap_comments
  FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM roadmaps
      WHERE roadmaps.id = roadmap_comments.roadmap_id
        AND roadmaps.user_id = auth.uid()
    )
  );

-- Finding 12 reverse
DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile" ON profiles
  FOR UPDATE USING (auth.uid() = id);

COMMIT;
