-- Add visibility controls for hiding internal data from public views
-- These columns control what information is visible to public visitors

-- show_comments: whether to show Linear comments (internal discussions) on issue detail
ALTER TABLE public_views ADD COLUMN IF NOT EXISTS show_comments BOOLEAN DEFAULT false;

-- show_activity: whether to show issue activity history (status changes, assignee changes, etc.)
ALTER TABLE public_views ADD COLUMN IF NOT EXISTS show_activity BOOLEAN DEFAULT false;
