-- 020_namespace_external_linear_ids_rollback.sql
-- Manual rollback for 020. Drops all sync triggers and linear_-prefixed
-- columns added by the expand migration.

BEGIN;

-- public_views
DROP TRIGGER IF EXISTS public_views_sync_linear_ids_insert ON public_views;
DROP TRIGGER IF EXISTS public_views_sync_linear_ids_update ON public_views;
DROP FUNCTION IF EXISTS sync_public_views_linear_ids();
DROP FUNCTION IF EXISTS sync_public_views_linear_ids_insert();

ALTER TABLE public_views
  DROP COLUMN linear_project_id,
  DROP COLUMN linear_team_id,
  DROP COLUMN linear_project_name,
  DROP COLUMN linear_team_name,
  DROP COLUMN excluded_linear_issue_ids;

-- customer_request_forms
DROP TRIGGER IF EXISTS customer_request_forms_sync_linear_ids_insert ON customer_request_forms;
DROP TRIGGER IF EXISTS customer_request_forms_sync_linear_ids_update ON customer_request_forms;
DROP FUNCTION IF EXISTS sync_customer_request_forms_linear_ids();
DROP FUNCTION IF EXISTS sync_customer_request_forms_linear_ids_insert();

ALTER TABLE customer_request_forms
  DROP COLUMN linear_project_id,
  DROP COLUMN linear_project_name;

-- roadmaps
DROP TRIGGER IF EXISTS roadmaps_sync_linear_ids_insert ON roadmaps;
DROP TRIGGER IF EXISTS roadmaps_sync_linear_ids_update ON roadmaps;
DROP FUNCTION IF EXISTS sync_roadmaps_linear_ids();
DROP FUNCTION IF EXISTS sync_roadmaps_linear_ids_insert();

ALTER TABLE roadmaps DROP COLUMN linear_project_ids;

-- roadmap_votes
DROP TRIGGER IF EXISTS roadmap_votes_sync_linear_issue_id_insert ON roadmap_votes;
DROP TRIGGER IF EXISTS roadmap_votes_sync_linear_issue_id_update ON roadmap_votes;
DROP FUNCTION IF EXISTS sync_roadmap_votes_linear_issue_id();
DROP FUNCTION IF EXISTS sync_roadmap_votes_linear_issue_id_insert();

ALTER TABLE roadmap_votes DROP COLUMN linear_issue_id;

-- roadmap_comments
DROP TRIGGER IF EXISTS roadmap_comments_sync_linear_issue_id_insert ON roadmap_comments;
DROP TRIGGER IF EXISTS roadmap_comments_sync_linear_issue_id_update ON roadmap_comments;
DROP FUNCTION IF EXISTS sync_roadmap_comments_linear_issue_id();
DROP FUNCTION IF EXISTS sync_roadmap_comments_linear_issue_id_insert();

ALTER TABLE roadmap_comments DROP COLUMN linear_issue_id;

COMMIT;
