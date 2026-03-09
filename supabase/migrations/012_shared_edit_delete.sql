-- Allow all authenticated users to edit and delete shared resources

-- public_views
DROP POLICY IF EXISTS "Users can update own public_views" ON public_views;
CREATE POLICY "Authenticated users can update all public_views" ON public_views
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own public_views" ON public_views;
CREATE POLICY "Authenticated users can delete all public_views" ON public_views
    FOR DELETE USING (auth.role() = 'authenticated');

-- customer_request_forms
DROP POLICY IF EXISTS "Users can update own forms" ON customer_request_forms;
CREATE POLICY "Authenticated users can update all forms" ON customer_request_forms
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own forms" ON customer_request_forms;
CREATE POLICY "Authenticated users can delete all forms" ON customer_request_forms
    FOR DELETE USING (auth.role() = 'authenticated');

-- branding_settings
DROP POLICY IF EXISTS "Users can update own branding settings" ON branding_settings;
CREATE POLICY "Authenticated users can update all branding settings" ON branding_settings
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own branding settings" ON branding_settings;
CREATE POLICY "Authenticated users can delete all branding settings" ON branding_settings
    FOR DELETE USING (auth.role() = 'authenticated');

-- custom_domains
DROP POLICY IF EXISTS "Users can update own custom domains" ON custom_domains;
CREATE POLICY "Authenticated users can update all custom domains" ON custom_domains
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own custom domains" ON custom_domains;
CREATE POLICY "Authenticated users can delete all custom domains" ON custom_domains
    FOR DELETE USING (auth.role() = 'authenticated');

-- roadmaps
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
CREATE POLICY "Authenticated users can update all roadmaps" ON roadmaps
    FOR UPDATE USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;
CREATE POLICY "Authenticated users can delete all roadmaps" ON roadmaps
    FOR DELETE USING (auth.role() = 'authenticated');
