-- Storage bucket policies for branding assets
-- This file sets up Row Level Security policies for the 'branding' storage bucket

-- Policy 1: Allow public read access to all branding assets
-- This enables logos/favicons to be displayed on public forms and views
CREATE POLICY "Public branding assets are viewable by anyone"
ON storage.objects FOR SELECT
USING (bucket_id = 'branding');

-- Policy 2: Allow authenticated users to upload to their own folder
-- Users can only upload files to folders named with their user ID
CREATE POLICY "Users can upload branding assets to own folder"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 3: Allow users to update their own files
-- Users can update files in their own folder
CREATE POLICY "Users can update own branding assets"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- Policy 4: Allow users to delete their own files
-- Users can delete files in their own folder
CREATE POLICY "Users can delete own branding assets"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'branding' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
