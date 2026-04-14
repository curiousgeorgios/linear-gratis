-- View visibility controls: let view owners toggle which internal data is
-- exposed on the public page, hide the project-updates button, and exclude
-- specific issues.

ALTER TABLE public_views
  ADD COLUMN IF NOT EXISTS show_comments BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_project_updates BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS excluded_issue_ids TEXT[] DEFAULT '{}';
