-- 022_organisation_linear_connections.sql
-- Fix E from ADR 0001: lift the Linear connection from profile-scope to
-- org-scope, with N connections per org (agency support).
--
-- Background: profiles.linear_api_token has been the only home for Linear
-- credentials since migration 001. After org rollout (migration 015), the
-- permission boundary is the org but the integration boundary is still the
-- user, which is the most expensive tenancy ambiguity in the schema. This
-- migration introduces organisation_linear_connections as the new owner of
-- Linear credentials.
--
-- Design (per ADR 0001):
--   - One row per (organisation, Linear workspace) pair.
--   - UNIQUE (organisation_id, linear_workspace_id) prevents the same
--     Linear workspace being connected twice to the same org.
--   - UNIQUE (organisation_id, id) enables a composite FK from resource
--     tables that enforces same-org consistency: a resource and its
--     linear_connection_id MUST belong to the same organisation.
--
-- Backfill strategy: every existing org has exactly one owner today (per
-- migration 015's seed: one personal org per profile, the profile as
-- owner). For each such owner with a non-null linear_api_token, create one
-- organisation_linear_connections row. linear_workspace_id is left NULL
-- because it isn't stored on profiles; it must be discovered on first
-- Linear API call (the application will populate it lazily). The NOT NULL
-- constraint on linear_workspace_id is deferred to a future migration once
-- the discovery job has run.
--
-- The resource tables (roadmaps, customer_request_forms, public_views)
-- gain a nullable linear_connection_id column with a composite FK back to
-- organisation_linear_connections. Backfilled from the org's single
-- existing connection. NOT NULL is deferred until the contract.
--
-- profiles.linear_api_token is KEPT during expand. A sync trigger keeps the
-- token in the new table aligned with the owner's profile token, only
-- for the personal-org case (org has exactly one connection). When the
-- profile token changes, the connection is updated. The contract migration
-- will drop profiles.linear_api_token and remove the trigger.
--
-- Contract date target: v0.11.0.

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. organisation_linear_connections
-- -----------------------------------------------------------------------------

CREATE TABLE organisation_linear_connections (
  id                    UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  organisation_id       UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  linear_workspace_id   TEXT,        -- populated lazily on first Linear API call
  linear_workspace_name TEXT,
  linear_api_token      TEXT NOT NULL,
  connected_by          UUID REFERENCES profiles(id) ON DELETE SET NULL,
  connected_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One Linear workspace can be connected at most once per org
  UNIQUE (organisation_id, linear_workspace_id),

  -- Enables composite FK from resource tables: (org_id, connection_id) must
  -- exist as a row here, guaranteeing connection belongs to the same org.
  UNIQUE (organisation_id, id)
);

CREATE INDEX idx_olc_organisation_id ON organisation_linear_connections(organisation_id);
CREATE INDEX idx_olc_connected_by    ON organisation_linear_connections(connected_by);

ALTER TABLE organisation_linear_connections ENABLE ROW LEVEL SECURITY;

-- Members of the owning org can see the connection (metadata, not the token
-- in cleartext — application layer is responsible for not returning the
-- token to clients).
CREATE POLICY "Org members can view their Linear connections"
  ON organisation_linear_connections
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- Only owners can create / update / delete connections.
CREATE POLICY "Owners can insert Linear connections"
  ON organisation_linear_connections
  FOR INSERT WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
    AND connected_by = auth.uid()
  );

CREATE POLICY "Owners can update Linear connections"
  ON organisation_linear_connections
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete Linear connections"
  ON organisation_linear_connections
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE TRIGGER on_organisation_linear_connections_updated
  BEFORE UPDATE ON organisation_linear_connections
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();

-- -----------------------------------------------------------------------------
-- 2. Backfill: one connection per (org, owning profile) where the profile
--    has a Linear token. Each org currently has one owner per migration 015.
-- -----------------------------------------------------------------------------

INSERT INTO organisation_linear_connections (organisation_id, linear_api_token, connected_by)
SELECT
  m.organisation_id,
  p.linear_api_token,
  p.id
FROM organisation_members m
JOIN profiles p ON p.id = m.user_id
WHERE m.role = 'owner'
  AND p.linear_api_token IS NOT NULL;

-- -----------------------------------------------------------------------------
-- 3. linear_connection_id on resource tables that consume Linear data,
--    backfilled from the org's single connection, with composite FK.
--
-- branding_settings and custom_domains do NOT consume Linear data directly
-- so they do not get this column. (custom_domains routes to a public
-- resource via target_slug; the public resource carries the connection.)
-- -----------------------------------------------------------------------------

-- 3a. roadmaps
ALTER TABLE roadmaps
  ADD COLUMN linear_connection_id UUID,
  ADD CONSTRAINT roadmaps_linear_connection_same_org_fk
    FOREIGN KEY (organisation_id, linear_connection_id)
    REFERENCES organisation_linear_connections(organisation_id, id)
    ON DELETE RESTRICT;

UPDATE roadmaps r
SET linear_connection_id = c.id
FROM organisation_linear_connections c
WHERE c.organisation_id = r.organisation_id;

CREATE INDEX idx_roadmaps_linear_connection_id ON roadmaps(linear_connection_id);

-- 3b. customer_request_forms
ALTER TABLE customer_request_forms
  ADD COLUMN linear_connection_id UUID,
  ADD CONSTRAINT customer_request_forms_linear_connection_same_org_fk
    FOREIGN KEY (organisation_id, linear_connection_id)
    REFERENCES organisation_linear_connections(organisation_id, id)
    ON DELETE RESTRICT;

UPDATE customer_request_forms f
SET linear_connection_id = c.id
FROM organisation_linear_connections c
WHERE c.organisation_id = f.organisation_id;

CREATE INDEX idx_customer_request_forms_linear_connection_id ON customer_request_forms(linear_connection_id);

-- 3c. public_views
ALTER TABLE public_views
  ADD COLUMN linear_connection_id UUID,
  ADD CONSTRAINT public_views_linear_connection_same_org_fk
    FOREIGN KEY (organisation_id, linear_connection_id)
    REFERENCES organisation_linear_connections(organisation_id, id)
    ON DELETE RESTRICT;

UPDATE public_views v
SET linear_connection_id = c.id
FROM organisation_linear_connections c
WHERE c.organisation_id = v.organisation_id;

CREATE INDEX idx_public_views_linear_connection_id ON public_views(linear_connection_id);

-- -----------------------------------------------------------------------------
-- 4. Sync trigger: keep the connection token aligned with the owner's
--    profile token, but ONLY for the personal-org case (org has exactly
--    one connection). This preserves existing app behaviour where token
--    updates go to profiles.linear_api_token. Removed in the contract.
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION sync_profile_token_to_connection()
RETURNS TRIGGER AS $$
DECLARE
  conn_count INT;
  target_conn_id UUID;
BEGIN
  IF NEW.linear_api_token IS NOT DISTINCT FROM OLD.linear_api_token THEN
    RETURN NEW;
  END IF;

  -- Find the single org this profile owns, if it has exactly one owned org
  -- with exactly one Linear connection (the personal-org case).
  SELECT c.id, COUNT(*) OVER ()
    INTO target_conn_id, conn_count
  FROM organisation_linear_connections c
  JOIN organisation_members m ON m.organisation_id = c.organisation_id
  WHERE m.user_id = NEW.id
    AND m.role = 'owner'
  LIMIT 2;

  IF conn_count = 1 AND target_conn_id IS NOT NULL THEN
    UPDATE organisation_linear_connections
       SET linear_api_token = NEW.linear_api_token,
           updated_at       = NOW()
     WHERE id = target_conn_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER profiles_sync_token_to_connection
  AFTER UPDATE OF linear_api_token ON profiles
  FOR EACH ROW EXECUTE FUNCTION sync_profile_token_to_connection();

-- -----------------------------------------------------------------------------
-- 5. Update handle_new_user to auto-create a Linear connection placeholder
--    when the trigger creates the personal org. The token stays empty until
--    the user goes through the OAuth flow; we don't pre-populate it.
--
-- Decision 4 (ADR 0001): keep the personal-org auto-create for solo
-- signups. We don't auto-create a connection row at signup (no token yet).
-- The connection is created when the user completes the Linear OAuth flow.
-- handle_new_user is left unchanged.
-- -----------------------------------------------------------------------------

COMMIT;
