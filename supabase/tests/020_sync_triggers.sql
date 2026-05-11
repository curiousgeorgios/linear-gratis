-- 020_sync_triggers.sql
-- Verifies Fix C: the bidirectional sync triggers between legacy column names
-- (project_id, issue_id, project_ids) and the new linear_-prefixed columns.

BEGIN;

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  org_id UUID := gen_random_uuid();
  roadmap_id UUID;
  comment_id UUID;
  form_id UUID;
  view_id UUID;
  fetched_legacy TEXT;
  fetched_new TEXT;
  fetched_legacy_arr TEXT[];
  fetched_new_arr TEXT[];
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role)
  VALUES (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated');
  INSERT INTO profiles (id, email) VALUES (user_a, 'a@test.local') ON CONFLICT (id) DO NOTHING;
  INSERT INTO organisations (id, name, slug, created_by)
    VALUES (org_id, 'T', 't-' || replace(org_id::text, '-', ''), user_a);
  INSERT INTO organisation_members (organisation_id, user_id, role)
    VALUES (org_id, user_a, 'owner');

  -- INSERT setting only the legacy column populates the new column.
  INSERT INTO customer_request_forms (user_id, organisation_id, name, slug, project_id, project_name, form_title)
  VALUES (user_a, org_id, 'f1', 'sync-form-1-' || substring(gen_random_uuid()::text, 1, 8), 'PROJ-LEGACY', 'Proj Legacy', 'Form')
  RETURNING id INTO form_id;
  SELECT linear_project_id INTO fetched_new FROM customer_request_forms WHERE id = form_id;
  IF fetched_new IS DISTINCT FROM 'PROJ-LEGACY' THEN
    RAISE EXCEPTION 'sync (legacy -> new) failed on INSERT: linear_project_id = %', fetched_new;
  END IF;

  -- INSERT setting only the new column populates the legacy column.
  INSERT INTO customer_request_forms (user_id, organisation_id, name, slug, linear_project_id, linear_project_name, form_title)
  VALUES (user_a, org_id, 'f2', 'sync-form-2-' || substring(gen_random_uuid()::text, 1, 8), 'PROJ-NEW', 'Proj New', 'Form')
  RETURNING id INTO form_id;
  SELECT project_id INTO fetched_legacy FROM customer_request_forms WHERE id = form_id;
  IF fetched_legacy IS DISTINCT FROM 'PROJ-NEW' THEN
    RAISE EXCEPTION 'sync (new -> legacy) failed on INSERT: project_id = %', fetched_legacy;
  END IF;

  -- UPDATE on legacy column propagates to new column.
  UPDATE customer_request_forms SET project_id = 'PROJ-UPDATED-LEGACY' WHERE id = form_id;
  SELECT linear_project_id INTO fetched_new FROM customer_request_forms WHERE id = form_id;
  IF fetched_new IS DISTINCT FROM 'PROJ-UPDATED-LEGACY' THEN
    RAISE EXCEPTION 'sync (legacy -> new) failed on UPDATE: linear_project_id = %', fetched_new;
  END IF;

  -- UPDATE on new column propagates to legacy.
  UPDATE customer_request_forms SET linear_project_id = 'PROJ-UPDATED-NEW' WHERE id = form_id;
  SELECT project_id INTO fetched_legacy FROM customer_request_forms WHERE id = form_id;
  IF fetched_legacy IS DISTINCT FROM 'PROJ-UPDATED-NEW' THEN
    RAISE EXCEPTION 'sync (new -> legacy) failed on UPDATE: project_id = %', fetched_legacy;
  END IF;

  -- public_views array sync must treat the legacy column as authoritative when
  -- only excluded_issue_ids is supplied. A default '{}' on the new column used
  -- to mask the legacy value here.
  INSERT INTO public_views (user_id, organisation_id, name, slug, view_title, excluded_issue_ids)
  VALUES (user_a, org_id, 'v1', 'sync-view-1-' || substring(gen_random_uuid()::text, 1, 8), 'View', ARRAY['iss-1','iss-2'])
  RETURNING id INTO view_id;
  SELECT excluded_linear_issue_ids INTO fetched_new_arr FROM public_views WHERE id = view_id;
  IF fetched_new_arr IS DISTINCT FROM ARRAY['iss-1','iss-2'] THEN
    RAISE EXCEPTION 'sync (legacy -> new) failed on INSERT array: excluded_linear_issue_ids = %', fetched_new_arr;
  END IF;

  INSERT INTO public_views (user_id, organisation_id, name, slug, view_title, excluded_linear_issue_ids)
  VALUES (user_a, org_id, 'v2', 'sync-view-2-' || substring(gen_random_uuid()::text, 1, 8), 'View', ARRAY['iss-3','iss-4'])
  RETURNING id INTO view_id;
  SELECT excluded_issue_ids INTO fetched_legacy_arr FROM public_views WHERE id = view_id;
  IF fetched_legacy_arr IS DISTINCT FROM ARRAY['iss-3','iss-4'] THEN
    RAISE EXCEPTION 'sync (new -> legacy) failed on INSERT array: excluded_issue_ids = %', fetched_legacy_arr;
  END IF;

  -- Roadmap array sync
  INSERT INTO roadmaps (user_id, organisation_id, name, slug, title, project_ids)
  VALUES (user_a, org_id, 'r1', 'sync-rm-1-' || substring(gen_random_uuid()::text, 1, 8), 'Title', ARRAY['p1','p2'])
  RETURNING id INTO roadmap_id;
  SELECT linear_project_ids INTO fetched_new_arr FROM roadmaps WHERE id = roadmap_id;
  IF fetched_new_arr IS DISTINCT FROM ARRAY['p1','p2'] THEN
    RAISE EXCEPTION 'sync (legacy -> new) failed on INSERT array: linear_project_ids = %', fetched_new_arr;
  END IF;

  UPDATE roadmaps SET linear_project_ids = ARRAY['p3','p4'] WHERE id = roadmap_id;
  SELECT project_ids INTO fetched_legacy_arr FROM roadmaps WHERE id = roadmap_id;
  IF fetched_legacy_arr IS DISTINCT FROM ARRAY['p3','p4'] THEN
    RAISE EXCEPTION 'sync (new -> legacy) failed on UPDATE array: project_ids = %', fetched_legacy_arr;
  END IF;

  -- Comment issue_id sync
  INSERT INTO roadmap_comments (roadmap_id, organisation_id, issue_id, author_name, author_email, content)
  VALUES (roadmap_id, org_id, 'iss-legacy', 'A', 'a@test.local', 'x')
  RETURNING id INTO comment_id;
  SELECT linear_issue_id INTO fetched_new FROM roadmap_comments WHERE id = comment_id;
  IF fetched_new IS DISTINCT FROM 'iss-legacy' THEN
    RAISE EXCEPTION 'sync (legacy -> new) failed on roadmap_comments INSERT: linear_issue_id = %', fetched_new;
  END IF;

  RAISE NOTICE 'PASS: Fix C sync triggers maintain bidirectional consistency';
END $$;

ROLLBACK;
