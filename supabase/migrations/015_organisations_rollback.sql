-- 015_organisations_rollback.sql
-- Manual rollback for 015_organisations.sql.
-- NOT tracked as a migration. Run via `supabase db execute` or psql only if needed.
-- Restores the RLS state from migrations 003 / 012 (owner-scoped SELECT + WITH CHECK UPDATE/DELETE).

BEGIN;

-- 1. Restore handle_new_user to its pre-015 body
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. Drop the new member-scoped policies on each resource table
DROP POLICY IF EXISTS "Members can view public_views in their orgs"    ON public_views;
DROP POLICY IF EXISTS "Members can insert public_views into their orgs" ON public_views;
DROP POLICY IF EXISTS "Members can update public_views in their orgs"  ON public_views;
DROP POLICY IF EXISTS "Members can delete public_views in their orgs"  ON public_views;

DROP POLICY IF EXISTS "Members can view customer_request_forms in their orgs"    ON customer_request_forms;
DROP POLICY IF EXISTS "Members can insert customer_request_forms into their orgs" ON customer_request_forms;
DROP POLICY IF EXISTS "Members can update customer_request_forms in their orgs"  ON customer_request_forms;
DROP POLICY IF EXISTS "Members can delete customer_request_forms in their orgs"  ON customer_request_forms;

DROP POLICY IF EXISTS "Members can view branding_settings in their orgs"    ON branding_settings;
DROP POLICY IF EXISTS "Members can insert branding_settings into their orgs" ON branding_settings;
DROP POLICY IF EXISTS "Members can update branding_settings in their orgs"  ON branding_settings;
DROP POLICY IF EXISTS "Members can delete branding_settings in their orgs"  ON branding_settings;

DROP POLICY IF EXISTS "Members can view custom_domains in their orgs"    ON custom_domains;
DROP POLICY IF EXISTS "Members can insert custom_domains into their orgs" ON custom_domains;
DROP POLICY IF EXISTS "Members can update custom_domains in their orgs"  ON custom_domains;
DROP POLICY IF EXISTS "Members can delete custom_domains in their orgs"  ON custom_domains;

DROP POLICY IF EXISTS "Members can view roadmaps in their orgs"    ON roadmaps;
DROP POLICY IF EXISTS "Members can insert roadmaps into their orgs" ON roadmaps;
DROP POLICY IF EXISTS "Members can update roadmaps in their orgs"  ON roadmaps;
DROP POLICY IF EXISTS "Members can delete roadmaps in their orgs"  ON roadmaps;

-- 3. Reinstate the original owner-scoped policies (names from 003, 002, 005, 007, 010 + 012's WITH CHECK)
CREATE POLICY "Users can view own public_views"   ON public_views   FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own public_views" ON public_views   FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own public_views" ON public_views   FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own public_views" ON public_views   FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own forms"   ON customer_request_forms FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own forms" ON customer_request_forms FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own forms" ON customer_request_forms FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own forms" ON customer_request_forms FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own branding settings"   ON branding_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own branding settings" ON branding_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own branding settings" ON branding_settings FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own branding settings" ON branding_settings FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own custom domains"   ON custom_domains FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own custom domains" ON custom_domains FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own custom domains" ON custom_domains FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own custom domains" ON custom_domains FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own roadmaps"   ON roadmaps FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own roadmaps" ON roadmaps FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own roadmaps" ON roadmaps FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own roadmaps" ON roadmaps FOR DELETE USING (auth.uid() = user_id);

-- 4. Drop organisation_id columns, then the new tables and enum
ALTER TABLE public_views          DROP COLUMN organisation_id;
ALTER TABLE customer_request_forms DROP COLUMN organisation_id;
ALTER TABLE branding_settings      DROP COLUMN organisation_id;
ALTER TABLE custom_domains         DROP COLUMN organisation_id;
ALTER TABLE roadmaps               DROP COLUMN organisation_id;

DROP TABLE organisation_members;
DROP TABLE organisations;
DROP TYPE org_role;

COMMIT;
