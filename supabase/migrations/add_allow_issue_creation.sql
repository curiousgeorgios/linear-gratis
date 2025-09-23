-- Add allow_issue_creation column to public_views table
ALTER TABLE public_views
ADD COLUMN allow_issue_creation BOOLEAN NOT NULL DEFAULT false;

-- Add index for the new column
CREATE INDEX idx_public_views_allow_issue_creation ON public_views(allow_issue_creation);