-- Allow all authenticated users to view shared resources
-- But restrict UPDATE/DELETE to resource owner only

-- public_views
DROP POLICY IF EXISTS "Authenticated users can update all public_views" ON public_views;
CREATE POLICY "Users can update own public_views" ON public_views
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete all public_views" ON public_views;
CREATE POLICY "Users can delete own public_views" ON public_views
    FOR DELETE USING (auth.uid() = user_id);

-- customer_request_forms
DROP POLICY IF EXISTS "Authenticated users can update all forms" ON customer_request_forms;
CREATE POLICY "Users can update own forms" ON customer_request_forms
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete all forms" ON customer_request_forms;
CREATE POLICY "Users can delete own forms" ON customer_request_forms
    FOR DELETE USING (auth.uid() = user_id);

-- branding_settings
DROP POLICY IF EXISTS "Authenticated users can update all branding settings" ON branding_settings;
CREATE POLICY "Users can update own branding settings" ON branding_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete all branding settings" ON branding_settings;
CREATE POLICY "Users can delete own branding settings" ON branding_settings
    FOR DELETE USING (auth.uid() = user_id);

-- custom_domains
DROP POLICY IF EXISTS "Authenticated users can update all custom domains" ON custom_domains;
CREATE POLICY "Users can update own custom domains" ON custom_domains
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete all custom domains" ON custom_domains;
CREATE POLICY "Users can delete own custom domains" ON custom_domains
    FOR DELETE USING (auth.uid() = user_id);

-- roadmaps
DROP POLICY IF EXISTS "Authenticated users can update all roadmaps" ON roadmaps;
CREATE POLICY "Users can update own roadmaps" ON roadmaps
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can delete all roadmaps" ON roadmaps;
CREATE POLICY "Users can delete own roadmaps" ON roadmaps
    FOR DELETE USING (auth.uid() = user_id);
