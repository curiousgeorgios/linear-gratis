-- Add excluded_issue_ids column to public_views
-- Allows view owners to hide specific issues from showing up in public views
ALTER TABLE public_views ADD COLUMN IF NOT EXISTS excluded_issue_ids TEXT[] DEFAULT '{}';
