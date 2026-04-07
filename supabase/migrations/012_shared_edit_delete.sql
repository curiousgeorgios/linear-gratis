-- Replace existing UPDATE/DELETE policies with owner-only versions that include WITH CHECK
-- The original policies from migrations 002, 003, 005, 007, 010 used USING only;
-- these replacements add WITH CHECK to UPDATE to prevent user_id ownership theft.

-- public_views (originals from 003_supabase_migrations.sql)
DROP POLICY IF EXISTS "Users can update own public_views" ON public_views;
CREATE POLICY "Users can update own public_views" ON public_views
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own public_views" ON public_views;
CREATE POLICY "Users can delete own public_views" ON public_views
    FOR DELETE USING (auth.uid() = user_id);

-- customer_request_forms (originals from 002_supabase-forms-schema.sql)
DROP POLICY IF EXISTS "Users can update own forms" ON customer_request_forms;
CREATE POLICY "Users can update own forms" ON customer_request_forms
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own forms" ON customer_request_forms;
CREATE POLICY "Users can delete own forms" ON customer_request_forms
    FOR DELETE USING (auth.uid() = user_id);

-- branding_settings (originals from 005_add_branding_settings.sql)
DROP POLICY IF EXISTS "Users can update own branding settings" ON branding_settings;
CREATE POLICY "Users can update own branding settings" ON branding_settings
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own branding settings" ON branding_settings;
CREATE POLICY "Users can delete own branding settings" ON branding_settings
    FOR DELETE USING (auth.uid() = user_id);

-- custom_domains (originals from 007_add_custom_domains.sql)
DROP POLICY IF EXISTS "Users can update own custom domains" ON custom_domains;
CREATE POLICY "Users can update own custom domains" ON custom_domains
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own custom domains" ON custom_domains;
CREATE POLICY "Users can delete own custom domains" ON custom_domains
    FOR DELETE USING (auth.uid() = user_id);

-- roadmaps (originals from 010_add_roadmaps.sql)
DROP POLICY IF EXISTS "Users can update own roadmaps" ON roadmaps;
CREATE POLICY "Users can update own roadmaps" ON roadmaps
    FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own roadmaps" ON roadmaps;
CREATE POLICY "Users can delete own roadmaps" ON roadmaps
    FOR DELETE USING (auth.uid() = user_id);
