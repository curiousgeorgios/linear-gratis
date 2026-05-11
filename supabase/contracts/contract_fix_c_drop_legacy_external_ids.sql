-- contract_fix_c_drop_legacy_external_ids.sql
-- Contract phase for Fix C (ADR 0001). Target release: v0.9.0.
--
-- Prerequisite: every read/write in the application layer uses the linear_-
-- prefixed columns (linear_project_id, linear_project_ids, linear_team_id,
-- linear_project_name, linear_team_name, linear_issue_id,
-- excluded_linear_issue_ids). Grep the codebase to confirm:
--
--   grep -rE "\\.project_ids?|\\.project_name|\\.team_id|\\.team_name|\\.issue_id|\\.excluded_issue_ids" src/
--
-- Any remaining references must be cleaned up first. The expand migration's
-- sync triggers will be removed by this contract, so legacy column reads
-- post-contract will silently return NULL (the columns won't exist).

BEGIN;

-- Drop sync triggers and functions first, otherwise the trigger fires during
-- the ALTER TABLE DROP COLUMN and errors out.

DROP TRIGGER IF EXISTS public_views_sync_linear_ids_insert       ON public_views;
DROP TRIGGER IF EXISTS public_views_sync_linear_ids_update       ON public_views;
DROP FUNCTION IF EXISTS sync_public_views_linear_ids();
DROP FUNCTION IF EXISTS sync_public_views_linear_ids_insert();

DROP TRIGGER IF EXISTS customer_request_forms_sync_linear_ids_insert ON customer_request_forms;
DROP TRIGGER IF EXISTS customer_request_forms_sync_linear_ids_update ON customer_request_forms;
DROP FUNCTION IF EXISTS sync_customer_request_forms_linear_ids();
DROP FUNCTION IF EXISTS sync_customer_request_forms_linear_ids_insert();

DROP TRIGGER IF EXISTS roadmaps_sync_linear_ids_insert            ON roadmaps;
DROP TRIGGER IF EXISTS roadmaps_sync_linear_ids_update            ON roadmaps;
DROP FUNCTION IF EXISTS sync_roadmaps_linear_ids();
DROP FUNCTION IF EXISTS sync_roadmaps_linear_ids_insert();

DROP TRIGGER IF EXISTS roadmap_votes_sync_linear_issue_id_insert  ON roadmap_votes;
DROP TRIGGER IF EXISTS roadmap_votes_sync_linear_issue_id_update  ON roadmap_votes;
DROP FUNCTION IF EXISTS sync_roadmap_votes_linear_issue_id();
DROP FUNCTION IF EXISTS sync_roadmap_votes_linear_issue_id_insert();

DROP TRIGGER IF EXISTS roadmap_comments_sync_linear_issue_id_insert ON roadmap_comments;
DROP TRIGGER IF EXISTS roadmap_comments_sync_linear_issue_id_update ON roadmap_comments;
DROP FUNCTION IF EXISTS sync_roadmap_comments_linear_issue_id();
DROP FUNCTION IF EXISTS sync_roadmap_comments_linear_issue_id_insert();

ALTER TABLE public_views
  DROP COLUMN project_id,
  DROP COLUMN team_id,
  DROP COLUMN project_name,
  DROP COLUMN team_name,
  DROP COLUMN excluded_issue_ids;

ALTER TABLE customer_request_forms
  DROP COLUMN project_id,
  DROP COLUMN project_name;

ALTER TABLE roadmaps DROP COLUMN project_ids;

ALTER TABLE roadmap_votes    DROP COLUMN issue_id;
ALTER TABLE roadmap_comments DROP COLUMN issue_id;

COMMIT;
