-- Allow public views to include only issues with selected Linear issue labels.

ALTER TABLE public_views
  ADD COLUMN IF NOT EXISTS allowed_label_ids TEXT[] DEFAULT '{}';
