-- 021_user_id_created_by_sync.sql
-- Verifies Fix D: user_id and created_by stay in sync via the generic
-- sync_user_id_created_by trigger.

BEGIN;

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  org_id UUID := gen_random_uuid();
  view_id UUID;
  fetched UUID;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated');
  INSERT INTO profiles (id, email) VALUES (user_a, 'a@test.local') ON CONFLICT (id) DO NOTHING;
  INSERT INTO organisations (id, name, slug, created_by)
    VALUES (org_id, 'T', 't-' || replace(org_id::text, '-', ''), user_a);
  INSERT INTO organisation_members (organisation_id, user_id, role)
    VALUES (org_id, user_a, 'owner');

  -- INSERT setting only created_by populates user_id.
  INSERT INTO public_views (created_by, organisation_id, name, slug, view_title)
  VALUES (user_a, org_id, 'v', 'd-sync-1-' || substring(gen_random_uuid()::text, 1, 8), 'View')
  RETURNING id INTO view_id;
  SELECT user_id INTO fetched FROM public_views WHERE id = view_id;
  IF fetched IS DISTINCT FROM user_a THEN
    RAISE EXCEPTION 'sync (created_by -> user_id) failed on INSERT: user_id = %', fetched;
  END IF;

  -- INSERT setting only user_id populates created_by.
  INSERT INTO public_views (user_id, organisation_id, name, slug, view_title)
  VALUES (user_a, org_id, 'v', 'd-sync-2-' || substring(gen_random_uuid()::text, 1, 8), 'View')
  RETURNING id INTO view_id;
  SELECT created_by INTO fetched FROM public_views WHERE id = view_id;
  IF fetched IS DISTINCT FROM user_a THEN
    RAISE EXCEPTION 'sync (user_id -> created_by) failed on INSERT: created_by = %', fetched;
  END IF;

  RAISE NOTICE 'PASS: Fix D user_id <-> created_by sync triggers';
END $$;

ROLLBACK;
