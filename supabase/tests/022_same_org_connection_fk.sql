-- 022_same_org_connection_fk.sql
-- Verifies Fix E: the composite FK from a resource to organisation_linear_connections
-- rejects an attempt to point a resource at another org's connection.

BEGIN;

DO $$
DECLARE
  user_a UUID := gen_random_uuid();
  user_b UUID := gen_random_uuid();
  org_a UUID := gen_random_uuid();
  org_b UUID := gen_random_uuid();
  conn_a UUID;
  conn_b UUID;
  roadmap_id UUID;
  caught BOOLEAN := false;
BEGIN
  INSERT INTO auth.users (id, email, instance_id, aud, role) VALUES
    (user_a, 'a@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated'),
    (user_b, 'b@test.local', '00000000-0000-0000-0000-000000000000'::uuid, 'authenticated', 'authenticated');
  INSERT INTO profiles (id, email) VALUES (user_a, 'a@test.local'), (user_b, 'b@test.local')
    ON CONFLICT (id) DO NOTHING;
  INSERT INTO organisations (id, name, slug, created_by) VALUES
    (org_a, 'A', 'a-' || replace(org_a::text, '-', ''), user_a),
    (org_b, 'B', 'b-' || replace(org_b::text, '-', ''), user_b);
  INSERT INTO organisation_members (organisation_id, user_id, role) VALUES
    (org_a, user_a, 'owner'),
    (org_b, user_b, 'owner');

  INSERT INTO organisation_linear_connections (organisation_id, linear_api_token, connected_by)
  VALUES (org_a, 'fake-token-a', user_a) RETURNING id INTO conn_a;
  INSERT INTO organisation_linear_connections (organisation_id, linear_api_token, connected_by)
  VALUES (org_b, 'fake-token-b', user_b) RETURNING id INTO conn_b;

  -- Attempt to insert a roadmap in org_a that points at org_b's connection.
  -- The composite FK (organisation_id, linear_connection_id) → (organisation_id, id)
  -- must reject this.
  BEGIN
    INSERT INTO roadmaps (user_id, organisation_id, linear_connection_id, name, slug, title)
    VALUES (user_a, org_a, conn_b, 'cross-org', 'cross-' || substring(gen_random_uuid()::text, 1, 8), 'Cross');
  EXCEPTION WHEN foreign_key_violation THEN
    caught := true;
  END;

  IF NOT caught THEN
    RAISE EXCEPTION 'FAIL: cross-org linear_connection_id was accepted';
  END IF;

  -- Sanity: same-org reference IS accepted.
  INSERT INTO roadmaps (user_id, organisation_id, linear_connection_id, name, slug, title)
  VALUES (user_a, org_a, conn_a, 'same-org', 'same-' || substring(gen_random_uuid()::text, 1, 8), 'Same')
  RETURNING id INTO roadmap_id;

  -- Token deletion clears nullable resource references before deleting the
  -- connection. Verify that path is compatible with the RESTRICT FK.
  UPDATE roadmaps SET linear_connection_id = NULL WHERE id = roadmap_id;
  UPDATE public_resources SET linear_connection_id = NULL WHERE organisation_id = org_a;
  DELETE FROM organisation_linear_connections WHERE id = conn_a;

  RAISE NOTICE 'PASS: composite FK enforces same-org Linear connection';
END $$;

ROLLBACK;
