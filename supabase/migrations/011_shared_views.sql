-- Allow all authenticated users to see all views, forms, branding, domains, and roadmaps
-- INSERT/UPDATE/DELETE remain restricted to the owner (auth.uid() = user_id)

-- public_views
DROP POLICY IF EXISTS "Users can view own public_views" ON public_views;
CREATE POLICY "Authenticated users can view all public_views" ON public_views
    FOR SELECT USING (auth.role() = 'authenticated');

-- customer_request_forms (keep the public access policy for active forms)
DROP POLICY IF EXISTS "Users can view own forms" ON customer_request_forms;
CREATE POLICY "Authenticated users can view all forms" ON customer_request_forms
    FOR SELECT USING (auth.role() = 'authenticated');

-- branding_settings
DROP POLICY IF EXISTS "Users can view own branding settings" ON branding_settings;
CREATE POLICY "Authenticated users can view all branding settings" ON branding_settings
    FOR SELECT USING (auth.role() = 'authenticated');

-- custom_domains
DROP POLICY IF EXISTS "Users can view own custom domains" ON custom_domains;
CREATE POLICY "Authenticated users can view all custom domains" ON custom_domains
    FOR SELECT USING (auth.role() = 'authenticated');

-- roadmaps
DROP POLICY IF EXISTS "Users can view own roadmaps" ON roadmaps;
CREATE POLICY "Authenticated users can view all roadmaps" ON roadmaps
    FOR SELECT USING (auth.role() = 'authenticated');
