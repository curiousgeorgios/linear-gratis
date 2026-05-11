-- 020_namespace_external_linear_ids.sql
-- Fix C from ADR 0001: namespace external-system identifiers.
--
-- Linear identifiers (project IDs, team IDs, issue IDs) currently sit in
-- columns named project_id, team_id, issue_id with no provider namespace.
-- This makes the integration seam invisible to readers and would force a
-- column-by-column disambiguation if a second integration is ever added.
--
-- Expand-only migration: this adds linear_-prefixed columns alongside the
-- existing ones and keeps them in sync via BEFORE INSERT/UPDATE triggers.
-- The application can migrate at its own pace; both column names continue
-- to work. The contract migration (021_contract_*) will drop the old
-- columns once application code has migrated.
--
-- Contract date target: v0.9.0 (one release after the application migration).

BEGIN;

-- -----------------------------------------------------------------------------
-- 1. public_views: project_id, team_id, project_name, team_name, excluded_issue_ids
-- -----------------------------------------------------------------------------

ALTER TABLE public_views
  ADD COLUMN linear_project_id          TEXT,
  ADD COLUMN linear_team_id             TEXT,
  ADD COLUMN linear_project_name        TEXT,
  ADD COLUMN linear_team_name           TEXT,
  ADD COLUMN excluded_linear_issue_ids  TEXT[];

UPDATE public_views SET
  linear_project_id         = project_id,
  linear_team_id            = team_id,
  linear_project_name       = project_name,
  linear_team_name          = team_name,
  excluded_linear_issue_ids = COALESCE(excluded_issue_ids, '{}');

CREATE OR REPLACE FUNCTION sync_public_views_linear_ids()
RETURNS TRIGGER AS $$
BEGIN
  -- project_id <-> linear_project_id
  IF NEW.linear_project_id IS DISTINCT FROM OLD.linear_project_id THEN
    NEW.project_id := NEW.linear_project_id;
  ELSIF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    NEW.linear_project_id := NEW.project_id;
  END IF;

  -- team_id <-> linear_team_id
  IF NEW.linear_team_id IS DISTINCT FROM OLD.linear_team_id THEN
    NEW.team_id := NEW.linear_team_id;
  ELSIF NEW.team_id IS DISTINCT FROM OLD.team_id THEN
    NEW.linear_team_id := NEW.team_id;
  END IF;

  -- project_name <-> linear_project_name
  IF NEW.linear_project_name IS DISTINCT FROM OLD.linear_project_name THEN
    NEW.project_name := NEW.linear_project_name;
  ELSIF NEW.project_name IS DISTINCT FROM OLD.project_name THEN
    NEW.linear_project_name := NEW.project_name;
  END IF;

  -- team_name <-> linear_team_name
  IF NEW.linear_team_name IS DISTINCT FROM OLD.linear_team_name THEN
    NEW.team_name := NEW.linear_team_name;
  ELSIF NEW.team_name IS DISTINCT FROM OLD.team_name THEN
    NEW.linear_team_name := NEW.team_name;
  END IF;

  -- excluded_issue_ids <-> excluded_linear_issue_ids
  IF NEW.excluded_linear_issue_ids IS DISTINCT FROM OLD.excluded_linear_issue_ids THEN
    NEW.excluded_issue_ids := NEW.excluded_linear_issue_ids;
  ELSIF NEW.excluded_issue_ids IS DISTINCT FROM OLD.excluded_issue_ids THEN
    NEW.excluded_linear_issue_ids := NEW.excluded_issue_ids;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- BEFORE INSERT needs a separate path because OLD is NULL on insert
CREATE OR REPLACE FUNCTION sync_public_views_linear_ids_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.linear_project_id         := COALESCE(NEW.linear_project_id,         NEW.project_id);
  NEW.project_id                := COALESCE(NEW.project_id,                NEW.linear_project_id);
  NEW.linear_team_id            := COALESCE(NEW.linear_team_id,            NEW.team_id);
  NEW.team_id                   := COALESCE(NEW.team_id,                   NEW.linear_team_id);
  NEW.linear_project_name       := COALESCE(NEW.linear_project_name,       NEW.project_name);
  NEW.project_name              := COALESCE(NEW.project_name,              NEW.linear_project_name);
  NEW.linear_team_name          := COALESCE(NEW.linear_team_name,          NEW.team_name);
  NEW.team_name                 := COALESCE(NEW.team_name,                 NEW.linear_team_name);
  IF COALESCE(array_length(NEW.excluded_linear_issue_ids, 1), 0) > 0 THEN
    NEW.excluded_issue_ids := NEW.excluded_linear_issue_ids;
  ELSIF COALESCE(array_length(NEW.excluded_issue_ids, 1), 0) > 0 THEN
    NEW.excluded_linear_issue_ids := NEW.excluded_issue_ids;
  ELSE
    NEW.excluded_linear_issue_ids := COALESCE(NEW.excluded_linear_issue_ids, NEW.excluded_issue_ids, '{}');
    NEW.excluded_issue_ids        := COALESCE(NEW.excluded_issue_ids,        NEW.excluded_linear_issue_ids, '{}');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER public_views_sync_linear_ids_insert
  BEFORE INSERT ON public_views
  FOR EACH ROW EXECUTE FUNCTION sync_public_views_linear_ids_insert();

CREATE TRIGGER public_views_sync_linear_ids_update
  BEFORE UPDATE ON public_views
  FOR EACH ROW EXECUTE FUNCTION sync_public_views_linear_ids();

-- -----------------------------------------------------------------------------
-- 2. customer_request_forms: project_id, project_name
-- -----------------------------------------------------------------------------

ALTER TABLE customer_request_forms
  ADD COLUMN linear_project_id    TEXT,
  ADD COLUMN linear_project_name  TEXT;

UPDATE customer_request_forms SET
  linear_project_id    = project_id,
  linear_project_name  = project_name;

ALTER TABLE customer_request_forms ALTER COLUMN linear_project_id   SET NOT NULL;
ALTER TABLE customer_request_forms ALTER COLUMN linear_project_name SET NOT NULL;

CREATE OR REPLACE FUNCTION sync_customer_request_forms_linear_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linear_project_id IS DISTINCT FROM OLD.linear_project_id THEN
    NEW.project_id := NEW.linear_project_id;
  ELSIF NEW.project_id IS DISTINCT FROM OLD.project_id THEN
    NEW.linear_project_id := NEW.project_id;
  END IF;

  IF NEW.linear_project_name IS DISTINCT FROM OLD.linear_project_name THEN
    NEW.project_name := NEW.linear_project_name;
  ELSIF NEW.project_name IS DISTINCT FROM OLD.project_name THEN
    NEW.linear_project_name := NEW.project_name;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_customer_request_forms_linear_ids_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.linear_project_id   := COALESCE(NEW.linear_project_id,   NEW.project_id);
  NEW.project_id          := COALESCE(NEW.project_id,          NEW.linear_project_id);
  NEW.linear_project_name := COALESCE(NEW.linear_project_name, NEW.project_name);
  NEW.project_name        := COALESCE(NEW.project_name,        NEW.linear_project_name);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER customer_request_forms_sync_linear_ids_insert
  BEFORE INSERT ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION sync_customer_request_forms_linear_ids_insert();

CREATE TRIGGER customer_request_forms_sync_linear_ids_update
  BEFORE UPDATE ON customer_request_forms
  FOR EACH ROW EXECUTE FUNCTION sync_customer_request_forms_linear_ids();

-- -----------------------------------------------------------------------------
-- 3. roadmaps: project_ids
-- -----------------------------------------------------------------------------

ALTER TABLE roadmaps
  ADD COLUMN linear_project_ids TEXT[];

UPDATE roadmaps SET linear_project_ids = COALESCE(project_ids, '{}');

CREATE OR REPLACE FUNCTION sync_roadmaps_linear_ids()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linear_project_ids IS DISTINCT FROM OLD.linear_project_ids THEN
    NEW.project_ids := NEW.linear_project_ids;
  ELSIF NEW.project_ids IS DISTINCT FROM OLD.project_ids THEN
    NEW.linear_project_ids := NEW.project_ids;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_roadmaps_linear_ids_insert()
RETURNS TRIGGER AS $$
BEGIN
  IF COALESCE(array_length(NEW.linear_project_ids, 1), 0) > 0 THEN
    NEW.project_ids := NEW.linear_project_ids;
  ELSIF COALESCE(array_length(NEW.project_ids, 1), 0) > 0 THEN
    NEW.linear_project_ids := NEW.project_ids;
  ELSE
    NEW.linear_project_ids := COALESCE(NEW.linear_project_ids, NEW.project_ids, '{}');
    NEW.project_ids        := COALESCE(NEW.project_ids,        NEW.linear_project_ids, '{}');
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmaps_sync_linear_ids_insert
  BEFORE INSERT ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION sync_roadmaps_linear_ids_insert();

CREATE TRIGGER roadmaps_sync_linear_ids_update
  BEFORE UPDATE ON roadmaps
  FOR EACH ROW EXECUTE FUNCTION sync_roadmaps_linear_ids();

-- -----------------------------------------------------------------------------
-- 4. roadmap_votes: issue_id
-- -----------------------------------------------------------------------------

ALTER TABLE roadmap_votes
  ADD COLUMN linear_issue_id TEXT;

UPDATE roadmap_votes SET linear_issue_id = issue_id;

ALTER TABLE roadmap_votes ALTER COLUMN linear_issue_id SET NOT NULL;

CREATE OR REPLACE FUNCTION sync_roadmap_votes_linear_issue_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linear_issue_id IS DISTINCT FROM OLD.linear_issue_id THEN
    NEW.issue_id := NEW.linear_issue_id;
  ELSIF NEW.issue_id IS DISTINCT FROM OLD.issue_id THEN
    NEW.linear_issue_id := NEW.issue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_roadmap_votes_linear_issue_id_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.linear_issue_id := COALESCE(NEW.linear_issue_id, NEW.issue_id);
  NEW.issue_id        := COALESCE(NEW.issue_id,        NEW.linear_issue_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_votes_sync_linear_issue_id_insert
  BEFORE INSERT ON roadmap_votes
  FOR EACH ROW EXECUTE FUNCTION sync_roadmap_votes_linear_issue_id_insert();

CREATE TRIGGER roadmap_votes_sync_linear_issue_id_update
  BEFORE UPDATE ON roadmap_votes
  FOR EACH ROW EXECUTE FUNCTION sync_roadmap_votes_linear_issue_id();

-- -----------------------------------------------------------------------------
-- 5. roadmap_comments: issue_id
-- -----------------------------------------------------------------------------

ALTER TABLE roadmap_comments
  ADD COLUMN linear_issue_id TEXT;

UPDATE roadmap_comments SET linear_issue_id = issue_id;

ALTER TABLE roadmap_comments ALTER COLUMN linear_issue_id SET NOT NULL;

CREATE OR REPLACE FUNCTION sync_roadmap_comments_linear_issue_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.linear_issue_id IS DISTINCT FROM OLD.linear_issue_id THEN
    NEW.issue_id := NEW.linear_issue_id;
  ELSIF NEW.issue_id IS DISTINCT FROM OLD.issue_id THEN
    NEW.linear_issue_id := NEW.issue_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_roadmap_comments_linear_issue_id_insert()
RETURNS TRIGGER AS $$
BEGIN
  NEW.linear_issue_id := COALESCE(NEW.linear_issue_id, NEW.issue_id);
  NEW.issue_id        := COALESCE(NEW.issue_id,        NEW.linear_issue_id);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER roadmap_comments_sync_linear_issue_id_insert
  BEFORE INSERT ON roadmap_comments
  FOR EACH ROW EXECUTE FUNCTION sync_roadmap_comments_linear_issue_id_insert();

CREATE TRIGGER roadmap_comments_sync_linear_issue_id_update
  BEFORE UPDATE ON roadmap_comments
  FOR EACH ROW EXECUTE FUNCTION sync_roadmap_comments_linear_issue_id();

COMMIT;
