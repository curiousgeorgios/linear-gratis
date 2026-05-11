-- 023_cross_type_slug_uniqueness.sql
-- Verifies Fix F: inserting two publishable resources of different types
-- with the same slug fails on public_resources.slug UNIQUE.

BEGIN;

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  org_id UUID := gen_random_uuid();
  shared_slug TEXT := 'shared-' || substring(gen_random_uuid()::text, 1, 8);
  caught BOOLEAN := false;
BEGIN
  IF has_column_privilege('anon', 'public_resources', 'password_hash', 'select') THEN
    RAISE EXCEPTION 'FAIL: anon can SELECT public_resources.password_hash';
  END IF;
  IF has_column_privilege('authenticated', 'public_resources', 'password_hash', 'select') THEN
    RAISE EXCEPTION 'FAIL: authenticated can SELECT public_resources.password_hash';
  END IF;
  IF NOT has_column_privilege('anon', 'public_resources', 'slug', 'select') THEN
    RAISE EXCEPTION 'FAIL: anon cannot SELECT public_resources.slug';
  END IF;

  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated');
  INSERT INTO profiles (id, email) VALUES (user_a, 'a@test.local') ON CONFLICT (id) DO NOTHING;
  INSERT INTO organisations (id, name, slug, created_by)
    VALUES (org_id, 'T', 't-' || replace(org_id::text, '-', ''), user_a);
  INSERT INTO organisation_members (organisation_id, user_id, role)
    VALUES (org_id, user_a, 'owner');

  -- First insert: a view with the shared slug.
  INSERT INTO public_views (user_id, organisation_id, name, slug, view_title)
  VALUES (user_a, org_id, 'v', shared_slug, 'View');

  -- Second insert: a form with the same slug. The BEFORE INSERT trigger on
  -- customer_request_forms creates a public_resources row; the UNIQUE on
  -- public_resources.slug rejects the duplicate.
  BEGIN
    INSERT INTO customer_request_forms (user_id, organisation_id, name, slug, project_id, project_name, form_title)
    VALUES (user_a, org_id, 'f', shared_slug, 'proj', 'Proj', 'Form');
  EXCEPTION WHEN unique_violation THEN
    caught := true;
  END;

  IF NOT caught THEN
    RAISE EXCEPTION 'FAIL: cross-type slug collision was accepted';
  END IF;

  -- Sanity: a different slug IS accepted across types.
  INSERT INTO customer_request_forms (user_id, organisation_id, name, slug, project_id, project_name, form_title)
  VALUES (user_a, org_id, 'f2', 'other-' || substring(gen_random_uuid()::text, 1, 8), 'proj', 'Proj', 'Form');

  RAISE NOTICE 'PASS: public_resources.slug UNIQUE enforces cross-type uniqueness';
END $$;

ROLLBACK;
