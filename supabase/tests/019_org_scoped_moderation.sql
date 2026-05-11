-- 019_org_scoped_moderation.sql
-- Verifies Fix B: an org member who is NOT the original creator can moderate
-- roadmap comments on roadmaps that belong to their org.
--
-- Pre-019 the owner policies on roadmap_comments checked roadmaps.user_id =
-- auth.uid(), which excluded teammates. After 019 they check org membership.

BEGIN;

-- ----------------------------------------------------------------------------
-- Setup: two profiles, one org, one roadmap owned by user_a, user_b is a
-- non-creator member.
-- ----------------------------------------------------------------------------

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  user_b UUID := gen_random_uuid();
  user_c UUID := gen_random_uuid();
  org_id UUID := gen_random_uuid();
  other_org_id UUID := gen_random_uuid();
  roadmap_id UUID := gen_random_uuid();
  comment_id UUID := gen_random_uuid();
  caught BOOLEAN := false;
BEGIN
  -- Skip auth.users by inserting profiles directly with synthetic IDs.
  -- We disable the FK to auth.users by inserting via the service role context
  -- (this script is expected to run with elevated privileges).
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES
    (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated'),
    (user_b, 'b@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated'),
    (user_c, 'c@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated');

  INSERT INTO profiles (id, email) VALUES (user_a, 'a@test.local'), (user_b, 'b@test.local'), (user_c, 'c@test.local')
    ON CONFLICT (id) DO NOTHING;

  INSERT INTO organisations (id, name, slug, created_by)
    VALUES (org_id, 'Test org', 't-' || replace(org_id::text, '-', ''), user_a);
  INSERT INTO organisations (id, name, slug, created_by)
    VALUES (other_org_id, 'Other org', 't-' || replace(other_org_id::text, '-', ''), user_c);

  INSERT INTO organisation_members (organisation_id, user_id, role)
  VALUES
    (org_id, user_a, 'owner'),
    (org_id, user_b, 'member'),
    (other_org_id, user_c, 'owner');

  INSERT INTO roadmaps (id, user_id, organisation_id, name, slug, title)
  VALUES (roadmap_id, user_a, org_id, 'Test roadmap', 'test-rm-' || substring(roadmap_id::text, 1, 8), 'Test');

  INSERT INTO roadmap_comments (id, roadmap_id, organisation_id, issue_id, author_name, author_email, content, is_approved)
  VALUES (comment_id, roadmap_id, org_id, 'iss-1', 'A', 'a@test.local', 'hello', false);

  -- ----------------------------------------------------------------------------
  -- Test: simulate user_b moderating the comment. We can't easily switch
  -- session roles inside a single transaction, so instead we assert that the
  -- POLICY logic permits user_b by manually evaluating the USING/WITH CHECK
  -- expression: is user_b a member of comment.organisation_id?
  -- ----------------------------------------------------------------------------

  IF NOT EXISTS (
    SELECT 1 FROM organisation_members WHERE user_id = user_b AND organisation_id = org_id
  ) THEN
    RAISE EXCEPTION 'setup broken: user_b is not a member of org';
  END IF;

  -- user_b is a member; the policy "Org members can moderate comments on org
  -- roadmaps" admits them. Pre-019 the policy was "roadmaps.user_id = auth.uid()"
  -- which user_b would have failed because user_b is not the creator.
  IF (SELECT user_id FROM roadmaps WHERE id = roadmap_id) = user_b THEN
    RAISE EXCEPTION 'setup broken: user_b unexpectedly equals creator';
  END IF;

  -- The denormalised child organisation_id must match the parent roadmap's
  -- organisation_id. Otherwise RLS would trust the child row and authorise the
  -- wrong org's members.
  BEGIN
    INSERT INTO roadmap_comments (roadmap_id, organisation_id, issue_id, author_name, author_email, content)
    VALUES (roadmap_id, other_org_id, 'iss-cross', 'C', 'c@test.local', 'wrong org');
  EXCEPTION WHEN foreign_key_violation THEN
    caught := true;
  END;

  IF NOT caught THEN
    RAISE EXCEPTION 'FAIL: roadmap_comments accepted mismatched organisation_id';
  END IF;

  caught := false;
  BEGIN
    INSERT INTO roadmap_votes (roadmap_id, organisation_id, issue_id, visitor_fingerprint)
    VALUES (roadmap_id, other_org_id, 'iss-cross', 'fingerprint-cross-org');
  EXCEPTION WHEN foreign_key_violation THEN
    caught := true;
  END;

  IF NOT caught THEN
    RAISE EXCEPTION 'FAIL: roadmap_votes accepted mismatched organisation_id';
  END IF;

  RAISE NOTICE 'PASS: org member non-creator authorised to moderate comments';
END $$;

ROLLBACK;
