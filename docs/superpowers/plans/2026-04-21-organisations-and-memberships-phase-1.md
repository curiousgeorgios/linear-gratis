# Organisations and memberships — Phase 1 implementation plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close the cross-tenant read leak on linear.gratis by introducing `organisations` + `organisation_members` tables, rewriting RLS to scope by org membership, and auto-migrating every existing user into a personal org. Zero user-visible UX change.

**Architecture:** One new SQL migration (`015_organisations.sql`) does the schema, seed, RLS rewrite and trigger update in a single transaction. Server-side API routes that use `supabaseAdmin` (bypassing RLS) are patched in the same PR to add explicit `user_id`/`organisation_id` filters. Client pages gain a tiny `getActiveOrgId` helper and include `organisation_id` on insert payloads.

**Tech Stack:** PostgreSQL via Supabase, Next.js 15 (App Router, `@supabase/ssr`), TypeScript. No test framework installed — verification uses SQL assertions inside the migration and a standalone Node RLS smoke-test script.

**Spec:** [`docs/superpowers/specs/2026-04-21-organisations-and-memberships-design.md`](../specs/2026-04-21-organisations-and-memberships-design.md)

---

## File map

Files created:
- `supabase/migrations/015_organisations.sql` — the migration
- `supabase/migrations/015_organisations_rollback.sql` — companion, never auto-applied
- `src/lib/organisations.ts` — tiny helper to resolve the current user's active org id
- `scripts/test-rls-isolation.mjs` — Node script that creates two test users, asserts cross-tenant SELECTs return no rows, and fails loudly otherwise

Files modified:
- `src/lib/supabase.ts` — add `Organisation`, `OrganisationMember` types; add `organisation_id` to the five resource types
- `src/app/views/page.tsx` — drop ownership UI gate; include `organisation_id` on insert/update
- `src/app/forms/page.tsx` — same treatment
- `src/app/profile/domains/page.tsx` — same treatment (domain mutations flow through API routes; only reads/types change)
- `src/app/profile/branding/page.tsx` — same treatment (if branding is written via the client; otherwise no change — branding is server-side via `/api/branding`)
- `src/app/api/domains/route.ts` — patch GET leak; write `organisation_id` on POST
- `src/app/api/roadmaps/route.ts` — patch GET leak; write `organisation_id` on POST
- `src/app/api/branding/route.ts` — write `organisation_id` on INSERT branch of POST
- `README.md` — appendix with the fork recipe

Not touched in Phase 1:
- `src/app/api/public-view/**` — already tenant-correct via slug lookup + `viewData.user_id`
- `src/app/api/domains/[domainId]/**` — already filters by `user_id`
- `src/app/api/roadmaps/[id]/**` — already filters by `user_id`

---

## Task 1: Write the `015_organisations.sql` migration

**Files:**
- Create: `supabase/migrations/015_organisations.sql`

This task produces the whole migration as one file. We write it in named sections and verify each section compiles before moving on by running it against a local Supabase instance in Task 3.

- [ ] **Step 1: Create the migration file with the schema section**

Create `supabase/migrations/015_organisations.sql`:

```sql
-- 015_organisations.sql
-- Introduce organisations + memberships as the access-control boundary.
-- Closes the cross-tenant read leak introduced by migration 011.
-- Single transaction: Supabase migrations run in an implicit BEGIN/COMMIT.

-- -----------------------------------------------------------------------------
-- 1. Schema
-- -----------------------------------------------------------------------------

CREATE TYPE org_role AS ENUM ('owner', 'member');

CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_orgs_created_by ON organisations(created_by);

CREATE TABLE organisation_members (
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);
CREATE INDEX idx_org_members_user ON organisation_members(user_id);

-- updated_at trigger reuse: the handle_updated_at function exists from migration 001
CREATE TRIGGER on_organisations_updated
  BEFORE UPDATE ON organisations
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
```

- [ ] **Step 2: Append the `organisation_id` column additions**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 2. Add nullable organisation_id to each resource table (populated in section 4)
-- -----------------------------------------------------------------------------

ALTER TABLE public_views          ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE customer_request_forms ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE branding_settings      ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE custom_domains         ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
ALTER TABLE roadmaps               ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;

CREATE INDEX idx_public_views_organisation_id          ON public_views(organisation_id);
CREATE INDEX idx_customer_request_forms_organisation_id ON customer_request_forms(organisation_id);
CREATE INDEX idx_branding_settings_organisation_id      ON branding_settings(organisation_id);
CREATE INDEX idx_custom_domains_organisation_id         ON custom_domains(organisation_id);
CREATE INDEX idx_roadmaps_organisation_id               ON roadmaps(organisation_id);
```

- [ ] **Step 3: Append the data seed**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 3. Seed: one personal organisation per existing profile, user as owner
-- -----------------------------------------------------------------------------

INSERT INTO organisations (name, slug, created_by)
SELECT
  COALESCE(NULLIF(split_part(email, '@', 1), ''), 'workspace') || '''s workspace',
  'u-' || replace(substring(id::text, 1, 18), '-', ''),
  id
FROM profiles;

INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT id, created_by, 'owner'::org_role FROM organisations;
```

- [ ] **Step 4: Append the resource backfill**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 4. Backfill: stamp every existing resource row with its owner's org id
-- -----------------------------------------------------------------------------

UPDATE public_views          v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE customer_request_forms v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE branding_settings      v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE custom_domains         v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
UPDATE roadmaps               v SET organisation_id = o.id FROM organisations o WHERE o.created_by = v.user_id;
```

- [ ] **Step 5: Append the orphan-row assertion block**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 5. Assertions: every resource row must have a non-null organisation_id
-- -----------------------------------------------------------------------------

DO $$
DECLARE
  orphan_count INT;
  profile_count INT;
  org_count INT;
BEGIN
  SELECT COUNT(*) INTO orphan_count FROM public_views          WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'public_views has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM customer_request_forms WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'customer_request_forms has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM branding_settings      WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'branding_settings has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM custom_domains         WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'custom_domains has % orphan rows', orphan_count; END IF;
  SELECT COUNT(*) INTO orphan_count FROM roadmaps               WHERE organisation_id IS NULL;
  IF orphan_count > 0 THEN RAISE EXCEPTION 'roadmaps has % orphan rows', orphan_count; END IF;

  SELECT COUNT(*) INTO profile_count FROM profiles;
  SELECT COUNT(*) INTO org_count     FROM organisations;
  IF org_count < profile_count THEN
    RAISE EXCEPTION 'expected >= % orgs (one per profile), found %', profile_count, org_count;
  END IF;
END $$;
```

- [ ] **Step 6: Append NOT NULL enforcement**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 6. Enforce NOT NULL now that all rows are populated
-- -----------------------------------------------------------------------------

ALTER TABLE public_views          ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE customer_request_forms ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE branding_settings      ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE custom_domains         ALTER COLUMN organisation_id SET NOT NULL;
ALTER TABLE roadmaps               ALTER COLUMN organisation_id SET NOT NULL;
```

- [ ] **Step 7: Append the DROP POLICY block**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 7. Drop every pre-existing policy on the five resource tables by exact name
-- -----------------------------------------------------------------------------

-- public_views (from migrations 003, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all public_views" ON public_views;
DROP POLICY IF EXISTS "Users can view own public_views"               ON public_views;
DROP POLICY IF EXISTS "Users can insert own public_views"             ON public_views;
DROP POLICY IF EXISTS "Users can update own public_views"             ON public_views;
DROP POLICY IF EXISTS "Users can delete own public_views"             ON public_views;

-- customer_request_forms (from migrations 002, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all forms"        ON customer_request_forms;
DROP POLICY IF EXISTS "Users can view own forms"                      ON customer_request_forms;
DROP POLICY IF EXISTS "Users can insert own forms"                    ON customer_request_forms;
DROP POLICY IF EXISTS "Users can update own forms"                    ON customer_request_forms;
DROP POLICY IF EXISTS "Users can delete own forms"                    ON customer_request_forms;
-- DELIBERATELY KEPT: "Anyone can view active forms for submission"   (needed for public submit)

-- branding_settings (from migrations 005, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all branding settings" ON branding_settings;
DROP POLICY IF EXISTS "Users can view own branding settings"          ON branding_settings;
DROP POLICY IF EXISTS "Users can insert own branding settings"        ON branding_settings;
DROP POLICY IF EXISTS "Users can update own branding settings"        ON branding_settings;
DROP POLICY IF EXISTS "Users can delete own branding settings"        ON branding_settings;
-- DELIBERATELY KEPT: "Anyone can view branding settings for public access" (needed for public render)

-- custom_domains (from migrations 007, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all custom domains" ON custom_domains;
DROP POLICY IF EXISTS "Users can view own custom domains"             ON custom_domains;
DROP POLICY IF EXISTS "Users can insert own custom domains"           ON custom_domains;
DROP POLICY IF EXISTS "Users can update own custom domains"           ON custom_domains;
DROP POLICY IF EXISTS "Users can delete own custom domains"           ON custom_domains;
-- DELIBERATELY KEPT: "Anyone can view verified active custom domains" (needed for hostname routing)

-- roadmaps (from migrations 010, 011, 012)
DROP POLICY IF EXISTS "Authenticated users can view all roadmaps"     ON roadmaps;
DROP POLICY IF EXISTS "Users can view own roadmaps"                   ON roadmaps;
DROP POLICY IF EXISTS "Users can insert own roadmaps"                 ON roadmaps;
DROP POLICY IF EXISTS "Users can update own roadmaps"                 ON roadmaps;
DROP POLICY IF EXISTS "Users can delete own roadmaps"                 ON roadmaps;
```

- [ ] **Step 8: Append the new member-scoped policies for all five resource tables**

Append to `015_organisations.sql`. Paste the same four-policy block five times, once per table name. (DRY is tempting here — we could use a plpgsql loop — but verbosity makes policy names greppable and easier to audit.)

```sql
-- -----------------------------------------------------------------------------
-- 8. New member-scoped policies on the five resource tables
-- -----------------------------------------------------------------------------

-- public_views
CREATE POLICY "Members can view public_views in their orgs" ON public_views
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert public_views into their orgs" ON public_views
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update public_views in their orgs" ON public_views
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete public_views in their orgs" ON public_views
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- customer_request_forms
CREATE POLICY "Members can view customer_request_forms in their orgs" ON customer_request_forms
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert customer_request_forms into their orgs" ON customer_request_forms
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update customer_request_forms in their orgs" ON customer_request_forms
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete customer_request_forms in their orgs" ON customer_request_forms
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- branding_settings
CREATE POLICY "Members can view branding_settings in their orgs" ON branding_settings
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert branding_settings into their orgs" ON branding_settings
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update branding_settings in their orgs" ON branding_settings
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete branding_settings in their orgs" ON branding_settings
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- custom_domains
CREATE POLICY "Members can view custom_domains in their orgs" ON custom_domains
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert custom_domains into their orgs" ON custom_domains
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update custom_domains in their orgs" ON custom_domains
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete custom_domains in their orgs" ON custom_domains
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

-- roadmaps
CREATE POLICY "Members can view roadmaps in their orgs" ON roadmaps
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can insert roadmaps into their orgs" ON roadmaps
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
CREATE POLICY "Members can update roadmaps in their orgs" ON roadmaps
  FOR UPDATE
  USING  (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
  WITH CHECK (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()));
CREATE POLICY "Members can delete roadmaps in their orgs" ON roadmaps
  FOR DELETE USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
```

- [ ] **Step 9: Append RLS on the new `organisations` and `organisation_members` tables**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 9. RLS on the new tables
-- -----------------------------------------------------------------------------

ALTER TABLE organisations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- organisations: members can read; only owners can update / delete; any authenticated user can create (claiming created_by = self)
CREATE POLICY "Members can view their orgs" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orgs" ON organisations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their orgs" ON organisations
  FOR UPDATE
  USING (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  )
  WITH CHECK (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

CREATE POLICY "Owners can delete their orgs" ON organisations
  FOR DELETE USING (
    id IN (
      SELECT organisation_id FROM organisation_members
      WHERE user_id = auth.uid() AND role = 'owner'
    )
  );

-- organisation_members: members can see co-members.
-- INSERT/UPDATE/DELETE: intentionally no Phase 1 policies. Memberships are only created by
-- (a) the seed block above, (b) the handle_new_user trigger below, both SECURITY DEFINER.
-- Phase 2 adds owner-only invite/remove policies.
CREATE POLICY "Members can view co-members" ON organisation_members
  FOR SELECT USING (
    organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );
```

- [ ] **Step 10: Append the replacement `handle_new_user` trigger function**

Append to `015_organisations.sql`:

```sql
-- -----------------------------------------------------------------------------
-- 10. Replace handle_new_user: every new auth user gets a personal org + owner row
-- CREATE OR REPLACE FUNCTION preserves the on_auth_user_created trigger (migration 001).
-- -----------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_org_id UUID := gen_random_uuid();
BEGIN
  INSERT INTO public.profiles (id, email) VALUES (NEW.id, NEW.email);

  INSERT INTO public.organisations (id, name, slug, created_by)
  VALUES (
    new_org_id,
    COALESCE(NULLIF(split_part(NEW.email, '@', 1), ''), 'workspace') || '''s workspace',
    'u-' || replace(substring(new_org_id::text, 1, 18), '-', ''),
    NEW.id
  );

  INSERT INTO public.organisation_members (organisation_id, user_id, role)
  VALUES (new_org_id, NEW.id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

- [ ] **Step 11: Commit**

```bash
git add supabase/migrations/015_organisations.sql
git commit -m "feat(db): add 015_organisations migration with org-scoped RLS

Creates organisations + organisation_members tables, adds organisation_id
to the five tenant resource tables, seeds one personal org per existing
profile, rewrites RLS to scope by org membership, and updates
handle_new_user to auto-provision a personal org for new signups.

Closes the cross-tenant read leak introduced by migration 011."
```

---

## Task 2: Write the `015_organisations_rollback.sql` companion

**Files:**
- Create: `supabase/migrations/015_organisations_rollback.sql`

Not registered as a Supabase migration — it lives in the dir for reference and is run manually only if a critical issue surfaces post-deploy.

- [ ] **Step 1: Write the rollback file**

Create `supabase/migrations/015_organisations_rollback.sql`:

```sql
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

-- 3. Reinstate the original owner-scoped policies (names from 003, 002, 005, 007, 010)
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
```

- [ ] **Step 2: Commit**

```bash
git add supabase/migrations/015_organisations_rollback.sql
git commit -m "chore(db): add manual rollback for 015_organisations"
```

---

## Task 3: Apply migration locally and verify invariants

**Files:**
- (verification only, no edits)

This task does a dry run against a local Supabase database. Use whichever local Supabase workflow this project already has — typically `supabase start` + `supabase db push` or a direct psql connection. If there's no local Supabase running, skip to Task 15 (apply to remote staging).

- [ ] **Step 1: Start local Supabase (if available)**

Run:
```bash
supabase status 2>&1 | head -5
```

If it reports "Stopped", run:
```bash
supabase start
```

If `supabase` is not installed on this machine, skip to Task 15 and do local verification against a throwaway staging project.

- [ ] **Step 2: Seed test data (if the DB is empty)**

Only if no rows exist in `profiles`. Via the Supabase SQL editor or `psql "$(supabase db url)"`:

```sql
-- Create two test profiles by inserting into auth.users (triggers handle_new_user).
-- Note: this runs the PRE-015 trigger because we haven't applied it yet.
INSERT INTO auth.users (id, email, encrypted_password, role, aud, email_confirmed_at)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice@example.test', '', 'authenticated', 'authenticated', now()),
  ('22222222-2222-2222-2222-222222222222', 'bob@example.test',   '', 'authenticated', 'authenticated', now());

-- Insert one of each resource row per user
INSERT INTO public_views (user_id, name, slug, view_title, is_active, show_assignees, show_labels, show_priorities, show_descriptions, show_comments, show_activity, show_project_updates, excluded_issue_ids, allowed_statuses, password_protected, allow_issue_creation)
VALUES
  ('11111111-1111-1111-1111-111111111111', 'alice view', 'alice-view', 'Alice', true, true, true, true, true, false, false, true, '{}', '{}', false, false),
  ('22222222-2222-2222-2222-222222222222', 'bob view',   'bob-view',   'Bob',   true, true, true, true, true, false, false, true, '{}', '{}', false, false);
```

- [ ] **Step 3: Apply the migration**

```bash
supabase db push
```

Expected: exits 0. If it fails with `RAISE EXCEPTION 'public_views has N orphan rows'` or similar, the backfill section didn't cover every row — investigate which table has rows with a `user_id` that isn't a `created_by` on any org (likely orphaned data from a deleted profile).

- [ ] **Step 4: Verify invariants**

Connect with `psql "$(supabase db url)"` and run:

```sql
-- Invariant 1: every profile has exactly one organisation owning it
SELECT
  (SELECT COUNT(*) FROM profiles) AS profiles,
  (SELECT COUNT(*) FROM organisations) AS orgs,
  (SELECT COUNT(*) FROM organisation_members WHERE role = 'owner') AS owners;
-- Expected: all three counts equal.

-- Invariant 2: every resource row has a non-null organisation_id belonging to an org the user_id is a member of
SELECT 'public_views' AS t, COUNT(*) AS bad
  FROM public_views v
  LEFT JOIN organisation_members m ON m.organisation_id = v.organisation_id AND m.user_id = v.user_id
  WHERE m.user_id IS NULL
UNION ALL SELECT 'forms', COUNT(*) FROM customer_request_forms v
  LEFT JOIN organisation_members m ON m.organisation_id = v.organisation_id AND m.user_id = v.user_id
  WHERE m.user_id IS NULL
UNION ALL SELECT 'branding', COUNT(*) FROM branding_settings v
  LEFT JOIN organisation_members m ON m.organisation_id = v.organisation_id AND m.user_id = v.user_id
  WHERE m.user_id IS NULL
UNION ALL SELECT 'domains', COUNT(*) FROM custom_domains v
  LEFT JOIN organisation_members m ON m.organisation_id = v.organisation_id AND m.user_id = v.user_id
  WHERE m.user_id IS NULL
UNION ALL SELECT 'roadmaps', COUNT(*) FROM roadmaps v
  LEFT JOIN organisation_members m ON m.organisation_id = v.organisation_id AND m.user_id = v.user_id
  WHERE m.user_id IS NULL;
-- Expected: all `bad` counts are 0.

-- Invariant 3: the pre-existing "Anyone can view..." carve-outs are still present
SELECT tablename, policyname FROM pg_policies
  WHERE policyname IN (
    'Anyone can view active forms for submission',
    'Anyone can view branding settings for public access',
    'Anyone can view verified active custom domains'
  );
-- Expected: three rows.

-- Invariant 4: the PR #8 wildcard policies are gone
SELECT tablename, policyname FROM pg_policies
  WHERE policyname LIKE 'Authenticated users can view all %';
-- Expected: zero rows.
```

- [ ] **Step 5: Verify the trigger**

```sql
INSERT INTO auth.users (id, email, encrypted_password, role, aud, email_confirmed_at)
VALUES ('33333333-3333-3333-3333-333333333333', 'carol@example.test', '', 'authenticated', 'authenticated', now());

SELECT
  (SELECT COUNT(*) FROM profiles WHERE id = '33333333-3333-3333-3333-333333333333') AS profile,
  (SELECT COUNT(*) FROM organisations WHERE created_by = '33333333-3333-3333-3333-333333333333') AS org,
  (SELECT COUNT(*) FROM organisation_members WHERE user_id = '33333333-3333-3333-3333-333333333333' AND role = 'owner') AS owner_row;
-- Expected: all three counts = 1.
```

- [ ] **Step 6: Do NOT commit anything**

Verification only — no file changes. Proceed to Task 4.

---

## Task 4: Patch the two live `supabaseAdmin` read leaks

**Files:**
- Modify: `src/app/api/domains/route.ts:13-38`
- Modify: `src/app/api/roadmaps/route.ts:16-57`

These routes use `supabaseAdmin` (which bypasses RLS) with no user filter. After Task 1's migration they would still leak all users' rows — RLS can't stop a service-role query. We add explicit `user_id` filters.

- [ ] **Step 1: Fix `GET /api/domains/route.ts`**

In `src/app/api/domains/route.ts`, replace lines `23-28`:

```tsx
    // Fetch all custom domains (shared across authenticated users)
    const { data, error } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .order('created_at', { ascending: false });
```

with:

```tsx
    // Fetch only the caller's custom domains. supabaseAdmin bypasses RLS, so the
    // user_id filter here is load-bearing — without it, every authenticated caller
    // sees every user's domains.
    const { data, error } = await supabaseAdmin
      .from('custom_domains')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
```

- [ ] **Step 2: Fix `GET /api/roadmaps/route.ts`**

In `src/app/api/roadmaps/route.ts`, replace lines `33-37`:

```tsx
    // Fetch all roadmaps (shared across authenticated users)
    const { data: roadmaps, error } = await supabaseAdmin
      .from('roadmaps')
      .select('*')
      .order('created_at', { ascending: false });
```

with:

```tsx
    // Fetch only the caller's roadmaps. supabaseAdmin bypasses RLS, so the
    // user_id filter here is load-bearing.
    const { data: roadmaps, error } = await supabaseAdmin
      .from('roadmaps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });
```

- [ ] **Step 3: Run lint + build to catch typos**

```bash
npm run lint -- src/app/api/domains/route.ts src/app/api/roadmaps/route.ts
npx tsc --noEmit
```

Expected: no errors in either command.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/domains/route.ts src/app/api/roadmaps/route.ts
git commit -m "fix(api): scope /api/domains and /api/roadmaps GET to the caller

Both routes use supabaseAdmin (service role, bypasses RLS) with no
filter, so every authenticated caller saw every user's rows. Add
.eq('user_id', user.id). Prerequisite for migration 015."
```

---

## Task 5: Extend types in `src/lib/supabase.ts`

**Files:**
- Modify: `src/lib/supabase.ts:25-192`

Add the two new types and extend the five existing resource types with `organisation_id`.

- [ ] **Step 1: Add the new types after `Profile`**

In `src/lib/supabase.ts`, after the `Profile` type (ends at line `31`), insert:

```tsx
export type Organisation = {
  id: string
  name: string
  slug: string
  created_by: string
  created_at: string
  updated_at: string
}

export type OrganisationMember = {
  organisation_id: string
  user_id: string
  role: 'owner' | 'member'
  created_at: string
}
```

- [ ] **Step 2: Add `organisation_id` to `CustomerRequestForm`**

In `src/lib/supabase.ts`, inside the `CustomerRequestForm` type, add `organisation_id: string` after `user_id: string`:

```tsx
export type CustomerRequestForm = {
  id: string
  user_id: string
  organisation_id: string
  // ... rest unchanged
}
```

- [ ] **Step 3: Add `organisation_id` to `PublicView`**

```tsx
export type PublicView = {
  id: string
  user_id: string
  organisation_id: string
  // ... rest unchanged
}
```

- [ ] **Step 4: Add `organisation_id` to `BrandingSettings`**

```tsx
export type BrandingSettings = {
  id: string
  user_id: string
  organisation_id: string
  // ... rest unchanged
}
```

- [ ] **Step 5: Add `organisation_id` to `CustomDomain`**

```tsx
export type CustomDomain = {
  id: string
  user_id: string
  organisation_id: string
  // ... rest unchanged
}
```

- [ ] **Step 6: Add `organisation_id` to `Roadmap`**

```tsx
export type Roadmap = {
  id: string
  user_id: string
  organisation_id: string
  // ... rest unchanged
}
```

- [ ] **Step 7: Typecheck**

```bash
npx tsc --noEmit
```

Expected: several errors of the form `Property 'organisation_id' is missing in type '...'` coming from call sites that build partial resource objects. These are the call sites we'll fix in Tasks 7–8. Don't try to fix them yet.

- [ ] **Step 8: Commit**

```bash
git add src/lib/supabase.ts
git commit -m "types: add Organisation, OrganisationMember; add organisation_id to resources"
```

---

## Task 6: Add `src/lib/organisations.ts` helper

**Files:**
- Create: `src/lib/organisations.ts`

Tiny utility to resolve the current user's active org id. Phase 1 always has exactly one org per user so we take the first membership. Phase 2 replaces this with a context-driven selection.

- [ ] **Step 1: Create the helper**

Create `src/lib/organisations.ts`:

```tsx
import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve the active organisation id for the current user.
 *
 * Phase 1: every user has exactly one organisation (their personal org), so we
 * return the first membership. Phase 2 will replace this with a context-driven
 * active-org selection (URL-scoped or localStorage-backed).
 *
 * Callers must already have an authenticated session — this function does not
 * handle auth; if there are no memberships, it returns null and the caller
 * should surface an error (shouldn't happen in practice because
 * handle_new_user creates a personal org atomically with the profile).
 */
export async function getActiveOrganisationId(
  supabase: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[organisations] failed to resolve active org id:', error)
    return null
  }
  return data?.organisation_id ?? null
}
```

- [ ] **Step 2: Typecheck**

```bash
npx tsc --noEmit src/lib/organisations.ts
```

Expected: no errors (other than the call-site errors from Task 5 that we're about to fix).

- [ ] **Step 3: Commit**

```bash
git add src/lib/organisations.ts
git commit -m "feat(lib): add getActiveOrganisationId helper

Phase 1 helper that returns the single personal org per user. Phase 2
replaces this with a context-driven active-org selection."
```

---

## Task 7: Update page components to write `organisation_id`

**Files:**
- Modify: `src/app/views/page.tsx`
- Modify: `src/app/forms/page.tsx`
- Modify: `src/app/profile/domains/page.tsx`
- Modify: `src/app/profile/branding/page.tsx` (only if this file writes branding via the client; check first)

For each page, we: (a) resolve `activeOrgId` once, (b) include it on every insert payload, (c) drop any UI check of the form `row.user_id === user?.id` (every visible row is now in the caller's org, and every member can edit it per Phase 1 roles).

- [ ] **Step 1: Patch `src/app/views/page.tsx` — imports and state**

In `src/app/views/page.tsx`, near the other `@/lib` imports (around line `25`), add:

```tsx
import { getActiveOrganisationId } from '@/lib/organisations'
```

In the state block inside `PublicViewsPage` (near line `54`), add:

```tsx
const [activeOrgId, setActiveOrgId] = useState<string | null>(null);
```

- [ ] **Step 2: Patch `src/app/views/page.tsx` — resolve active org in `loadUserData`**

In `loadUserData` (starts at line `107`), after the `Promise.all` block that loads profile + views, insert:

```tsx
const orgId = await getActiveOrganisationId(supabase, user.id);
setActiveOrgId(orgId);
```

- [ ] **Step 3: Patch `src/app/views/page.tsx` — include `organisation_id` on insert**

Find `const { error } = await supabase.from("public_views").insert({` (around line `262`). Add `organisation_id: activeOrgId,` as a property of the insert payload, immediately after `user_id: user.id,`:

```tsx
      const { error } = await supabase.from("public_views").insert({
        user_id: user.id,
        organisation_id: activeOrgId,
        name: viewName,
        // ... rest unchanged
      });
```

Before the insert, add an early-return guard:

```tsx
      if (!activeOrgId) {
        setMessage({ type: "error", text: "No active organisation. Reload the page and try again." });
        setSubmitting(false);
        return;
      }
```

- [ ] **Step 4: Patch `src/app/views/page.tsx` — no `organisation_id` change on update**

Leave `updateView` unchanged. The existing row already has `organisation_id` (set by the backfill), and the UPDATE policy doesn't let the caller change it.

- [ ] **Step 5: Patch `src/app/views/page.tsx` — drop the ownership UI check**

Around line `1419`, the block `{view.user_id === user?.id && ( <> <Edit/> <Delete/> </> )}`. Remove the conditional wrapper so Edit/Delete are always visible:

Before:
```tsx
                        {view.user_id === user?.id && (
                          <>
                            <Button ... > Edit </Button>
                            <Button ... > <Trash2 /> </Button>
                          </>
                        )}
```

After:
```tsx
                        <>
                          <Button ... > Edit </Button>
                          <Button ... > <Trash2 /> </Button>
                        </>
```

(Keep the button JSX exactly as it already is — only the conditional wrapper goes.)

- [ ] **Step 6: Typecheck**

```bash
npx tsc --noEmit
```

Expected: no errors in `src/app/views/page.tsx`. If there are, fix them before moving on.

- [ ] **Step 7: Repeat for `src/app/forms/page.tsx`**

Apply the same four patches:
1. Import `getActiveOrganisationId`.
2. Add `activeOrgId` state; resolve it in the page's load function.
3. Add `organisation_id: activeOrgId` to the `customer_request_forms` insert payload.
4. Drop any `form.user_id === user?.id` UI gate.

Read the file first to see its exact structure — it's a sibling of `views/page.tsx` but may differ in detail. Mirror the pattern.

- [ ] **Step 8: Repeat for `src/app/profile/domains/page.tsx`**

Domains are mostly mutated through the `/api/domains` routes (Task 8 handles those), so the page probably doesn't insert directly. Read the file and apply only the patches that are needed:
1. If the page inserts client-side, add `organisation_id`.
2. If the page renders rows with a `row.user_id === user?.id` check, drop the check.

- [ ] **Step 9: Check and patch `src/app/profile/branding/page.tsx`**

Read it. Branding writes go through `/api/branding` (patched in Task 8), so the page may only render settings. If it has no client-side write or ownership gate, skip this step.

- [ ] **Step 10: Commit**

```bash
git add src/app/views/page.tsx src/app/forms/page.tsx src/app/profile/domains/page.tsx src/app/profile/branding/page.tsx
git commit -m "feat(ui): write organisation_id on resource creates; drop ownership UI gates

Phase 1 of org-based sharing. Every visible row is now in the caller's
org (RLS enforces this), so UI ownership checks are no longer needed.
Inserts include organisation_id to satisfy the NOT NULL constraint from
migration 015."
```

---

## Task 8: Update server API routes to write `organisation_id`

**Files:**
- Modify: `src/app/api/domains/route.ts` (POST handler)
- Modify: `src/app/api/roadmaps/route.ts` (POST handler)
- Modify: `src/app/api/branding/route.ts` (POST handler, INSERT branch)

All three POST handlers currently `supabaseAdmin.from(...).insert({ user_id: user.id, ... })`. After migration 015, `organisation_id` is NOT NULL on all three tables, so every INSERT must include it. We resolve it server-side by querying `organisation_members` with the service-role key (bypasses RLS; this is safe because we immediately scope to `user.id`).

- [ ] **Step 1: Add a server-side org helper**

Append to `src/lib/organisations.ts`:

```tsx
/**
 * Server-side variant: resolve the active org id using the service-role client.
 * Safe because we always filter by a caller-provided user id that we've already
 * authenticated upstream.
 */
export async function getActiveOrganisationIdAdmin(
  admin: SupabaseClient,
  userId: string
): Promise<string | null> {
  const { data, error } = await admin
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error('[organisations] failed to resolve active org id (admin):', error)
    return null
  }
  return data?.organisation_id ?? null
}
```

- [ ] **Step 2: Patch `POST /api/domains/route.ts`**

In `src/app/api/domains/route.ts`:

Add the import at the top of the file:
```tsx
import { getActiveOrganisationIdAdmin } from '@/lib/organisations'
```

In the `POST` handler, after the auth check (after the `const body = await request.json()...` line), resolve the org id:
```tsx
    const organisationId = await getActiveOrganisationIdAdmin(supabaseAdmin, user.id);
    if (!organisationId) {
      return NextResponse.json(
        { error: 'No active organisation for this user' },
        { status: 500 }
      );
    }
```

Find the `supabaseAdmin.from('custom_domains').insert({...})` call in the POST handler and add `organisation_id: organisationId,` to the insert payload, immediately after `user_id: user.id,`.

- [ ] **Step 3: Patch `POST /api/roadmaps/route.ts`**

In `src/app/api/roadmaps/route.ts`:

At the top, add:
```tsx
import { getActiveOrganisationIdAdmin } from '@/lib/organisations'
```

In the `POST` handler, after the `verifyUser` / auth call, resolve the org id using the same block as Step 2, then add `organisation_id: organisationId,` to the insert payload (around line `110`).

- [ ] **Step 4: Patch `POST /api/branding/route.ts`**

In `src/app/api/branding/route.ts`:

At the top, add:
```tsx
import { getActiveOrganisationIdAdmin } from '@/lib/organisations'
```

In the `POST` handler, after the auth check, and **only on the INSERT branch** (`if (existing) { ... } else { ... insert(...) }` at lines `82-136`), resolve the org id and add `organisation_id: organisationId,` to the insert payload. The UPDATE branch (`result = await supabaseAdmin.from('branding_settings').update(...)`) does NOT need changing — the existing row's `organisation_id` is preserved.

Concretely, replace lines `109-135` (the INSERT branch) with:

```tsx
    } else {
      const organisationId = await getActiveOrganisationIdAdmin(supabaseAdmin, user.id);
      if (!organisationId) {
        return NextResponse.json(
          { error: 'No active organisation for this user' },
          { status: 500 }
        );
      }
      // Create new settings
      result = await supabaseAdmin
        .from('branding_settings')
        .insert({
          user_id: user.id,
          organisation_id: organisationId,
          logo_url: normalise(body.logo_url),
          logo_height: normalise(body.logo_height),
          favicon_url: normalise(body.favicon_url),
          brand_name: normalise(body.brand_name),
          tagline: normalise(body.tagline),
          primary_color: normalise(body.primary_color),
          secondary_color: normalise(body.secondary_color),
          accent_color: normalise(body.accent_color),
          background_color: normalise(body.background_color),
          text_color: normalise(body.text_color),
          border_color: normalise(body.border_color),
          font_family: normalise(body.font_family),
          heading_font_family: normalise(body.heading_font_family),
          footer_text: normalise(body.footer_text),
          footer_links: normalise(body.footer_links),
          show_powered_by: normalise(body.show_powered_by),
          social_links: normalise(body.social_links),
          custom_css: normalise(body.custom_css),
        })
        .select()
        .single();
    }
```

- [ ] **Step 5: Typecheck and lint**

```bash
npx tsc --noEmit
npm run lint -- src/app/api/domains/route.ts src/app/api/roadmaps/route.ts src/app/api/branding/route.ts src/lib/organisations.ts
```

Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/lib/organisations.ts src/app/api/domains/route.ts src/app/api/roadmaps/route.ts src/app/api/branding/route.ts
git commit -m "feat(api): write organisation_id on resource POSTs

Domains, roadmaps and branding POST handlers resolve the caller's
personal org and include organisation_id on INSERT. Required because
migration 015 makes organisation_id NOT NULL."
```

---

## Task 9: Write the RLS smoke-test script

**Files:**
- Create: `scripts/test-rls-isolation.mjs`

A standalone Node script that logs in as two users via the Supabase client (using real email/password auth) and asserts that neither can see the other's rows via `.select("*")` across the five tables. Fails loudly with a non-zero exit code if any isolation breaks. This is the minimum regression harness for the security fix.

- [ ] **Step 1: Create the script**

Create `scripts/test-rls-isolation.mjs`:

```js
#!/usr/bin/env node
// scripts/test-rls-isolation.mjs
//
// Smoke test: two test users, each with resources, assert neither can SELECT
// the other's rows. Run against a DB that already has migration 015 applied.
//
// Usage:
//   NEXT_PUBLIC_SUPABASE_URL=https://... \
//   NEXT_PUBLIC_SUPABASE_ANON_KEY=... \
//   SUPABASE_SERVICE_ROLE_KEY=... \
//   TEST_USER_A_EMAIL=alice@test ... TEST_USER_A_PASSWORD=... \
//   TEST_USER_B_EMAIL=bob@test ... TEST_USER_B_PASSWORD=... \
//   node scripts/test-rls-isolation.mjs
//
// The two test users must already exist, each with at least one row in each of
// the five resource tables. The script does not create data (keeps blast
// radius small).

import { createClient } from '@supabase/supabase-js'

const {
  NEXT_PUBLIC_SUPABASE_URL: url,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD,
  TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD,
} = process.env

for (const [name, val] of Object.entries({
  NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_ANON_KEY: anon,
  TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD, TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD,
})) {
  if (!val) { console.error(`missing env ${name}`); process.exit(1) }
}

const TABLES = ['public_views', 'customer_request_forms', 'branding_settings', 'custom_domains', 'roadmaps']

async function sessionFor(email, password) {
  const client = createClient(url, anon, { auth: { persistSession: false } })
  const { data, error } = await client.auth.signInWithPassword({ email, password })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return { client, userId: data.user.id }
}

async function main() {
  const a = await sessionFor(TEST_USER_A_EMAIL, TEST_USER_A_PASSWORD)
  const b = await sessionFor(TEST_USER_B_EMAIL, TEST_USER_B_PASSWORD)

  let failures = 0
  for (const table of TABLES) {
    // A should see only rows whose user_id is A's
    const aRows = await a.client.from(table).select('user_id')
    if (aRows.error) { console.error(`[${table}] A select error: ${aRows.error.message}`); failures++; continue }
    const aBad = (aRows.data ?? []).filter(r => r.user_id !== a.userId)
    if (aBad.length) { console.error(`[${table}] A saw ${aBad.length} rows belonging to other users`); failures++ }

    // B should see only rows whose user_id is B's
    const bRows = await b.client.from(table).select('user_id')
    if (bRows.error) { console.error(`[${table}] B select error: ${bRows.error.message}`); failures++; continue }
    const bBad = (bRows.data ?? []).filter(r => r.user_id !== b.userId)
    if (bBad.length) { console.error(`[${table}] B saw ${bBad.length} rows belonging to other users`); failures++ }

    console.log(`[${table}] OK — A saw ${aRows.data?.length ?? 0} rows, B saw ${bRows.data?.length ?? 0} rows`)
  }

  // Cross-tenant write attempt: A tries to insert into B's org
  const bMemberships = await b.client.from('organisation_members').select('organisation_id').eq('user_id', b.userId)
  const bOrg = bMemberships.data?.[0]?.organisation_id
  if (bOrg) {
    const wrote = await a.client.from('public_views').insert({
      user_id: a.userId,
      organisation_id: bOrg,
      name: 'attack', slug: `attack-${Date.now()}`, view_title: 'x',
      is_active: true, show_assignees: true, show_labels: true,
      show_priorities: true, show_descriptions: true,
      show_comments: false, show_activity: false,
      show_project_updates: true, excluded_issue_ids: [], allowed_statuses: [],
      password_protected: false, allow_issue_creation: false,
    })
    if (!wrote.error) {
      console.error('[public_views] A was able to INSERT a row into B\'s org — RLS broken')
      failures++
    } else {
      console.log(`[public_views] OK — cross-tenant INSERT was rejected: ${wrote.error.message}`)
    }
  }

  if (failures > 0) {
    console.error(`\nFAIL: ${failures} isolation failures`)
    process.exit(1)
  }
  console.log('\nPASS: RLS isolation holds across all five tables')
}

main().catch(err => { console.error(err); process.exit(1) })
```

- [ ] **Step 2: Make it runnable**

```bash
chmod +x scripts/test-rls-isolation.mjs
```

- [ ] **Step 3: Commit**

```bash
git add scripts/test-rls-isolation.mjs
git commit -m "test: add RLS isolation smoke test

Signs in as two real users and asserts cross-tenant SELECTs return no
foreign rows, plus that cross-tenant INSERT is rejected. Standalone
Node script — no test framework dependency."
```

---

## Task 10: Document the fork recipe in README

**Files:**
- Modify: `README.md` (append an appendix)

Self-hosters (Dude Agency fork or any other) who want to keep "everyone on this instance shares resources" need a recipe to consolidate their personal orgs into one shared org after migration 015 runs.

- [ ] **Step 1: Append the appendix**

Append to `README.md`:

````markdown

## Appendix: shared-resources recipe for self-hosters

Migration `015_organisations.sql` gives every existing user a personal organisation and scopes all resource reads to members of that organisation. On a multi-user deployment where every user on the instance is a colleague (e.g. an agency running their own fork), you may want the pre-015 behaviour where everyone sees everyone's resources.

Run the following SQL **once, after `015_organisations.sql` has been applied**. It's fork-specific configuration — not part of the migration suite.

```sql
BEGIN;

-- 1. Create one shared organisation owned by the oldest user on the instance
INSERT INTO organisations (id, name, slug, created_by)
VALUES (gen_random_uuid(), 'Team', 'team',
        (SELECT id FROM profiles ORDER BY created_at LIMIT 1));

-- 2. Add every user as a member (oldest user = owner, rest = members)
INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT
  (SELECT id FROM organisations WHERE slug = 'team'),
  id,
  CASE WHEN id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1)
       THEN 'owner'::org_role
       ELSE 'member'::org_role
  END
FROM profiles;

-- 3. Point every existing resource at the shared org
UPDATE public_views          SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE customer_request_forms SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE branding_settings      SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE custom_domains         SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE roadmaps               SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');

-- 4. Drop now-empty personal orgs. ON DELETE CASCADE on organisation_members
--    removes the personal-org membership rows; the shared 'team' org's
--    membership rows are untouched because they reference a different
--    organisation_id.
DELETE FROM organisations o
WHERE NOT EXISTS (SELECT 1 FROM public_views          WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM customer_request_forms WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM branding_settings      WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM custom_domains         WHERE organisation_id = o.id)
  AND NOT EXISTS (SELECT 1 FROM roadmaps               WHERE organisation_id = o.id);

COMMIT;
```

After running, every user on the instance sees every resource. New signups still get a personal org via the `handle_new_user` trigger; run steps 2–4 periodically if you want to keep them in the shared model, or modify the trigger yourself. A Phase 2 roadmap item is to turn this into a first-class self-host config flag.
````

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: add fork recipe for self-hosted shared-resources deployments"
```

---

## Task 11: Apply migration to remote / staging, run smoke test, manual verification

**Files:**
- (verification only)

- [ ] **Step 1: Apply the migration to staging**

```bash
supabase db push --db-url "$STAGING_DATABASE_URL"
```

Or via the Supabase dashboard SQL editor if that's the workflow.

Expected: exits 0. If the assertion block inside the migration aborts, the migration has rolled back — investigate which assertion failed (error message includes the table name and orphan count) before retrying.

- [ ] **Step 2: Re-run the invariant queries from Task 3 Step 4 against staging**

Connect to the staging DB and run the four invariant queries. All four must pass.

- [ ] **Step 3: Run the smoke test against staging**

Set up two pre-existing test users on staging (via the signup page or the dashboard). Each must have at least one row in each of the five tables.

Then:

```bash
NEXT_PUBLIC_SUPABASE_URL=$STAGING_SUPABASE_URL \
NEXT_PUBLIC_SUPABASE_ANON_KEY=$STAGING_ANON_KEY \
TEST_USER_A_EMAIL=alice@test.staging \
TEST_USER_A_PASSWORD=... \
TEST_USER_B_EMAIL=bob@test.staging \
TEST_USER_B_PASSWORD=... \
node scripts/test-rls-isolation.mjs
```

Expected: `PASS: RLS isolation holds across all five tables`.

- [ ] **Step 4: Manual smoke test in the browser**

Sign in to the staging URL as user A. Visit `/views`. Count the rows. Sign out. Sign in as user B. Visit `/views`. Count the rows. Assert neither user sees the other's views.

Repeat for `/forms`, `/profile/domains`, `/profile/branding` (if applicable), `/roadmaps`.

- [ ] **Step 5: Create a pull request**

Push the branch and open a PR. PR body template:

```markdown
# Phase 1: organisations + memberships (closes cross-tenant read leak from PR #8)

## Summary
- Adds `organisations` + `organisation_members` tables
- Rewrites RLS on `public_views`, `customer_request_forms`, `branding_settings`, `custom_domains`, `roadmaps` to scope by org membership
- Every existing user auto-migrated to a personal org (zero UX change)
- Two live `supabaseAdmin` read leaks patched (`GET /api/domains`, `GET /api/roadmaps`)
- Three API POST handlers updated to write the new required `organisation_id`
- Fork recipe in README appendix for self-hosted shared-resources deployments

## Security impact
Fixes the leak merged in PR #8: any authenticated user could previously `SELECT *` from any of five tables including bcrypt `password_hash` values.

## Test plan
- [ ] Migration applied locally, invariant queries all pass
- [ ] `scripts/test-rls-isolation.mjs` passes against staging
- [ ] Manual smoke test: two users, neither sees the other's resources
- [ ] `npm run lint` + `npx tsc --noEmit` clean

## Rollback
`supabase/migrations/015_organisations_rollback.sql` — manual, not auto-applied.
```

- [ ] **Step 6: After merge, deploy and re-run the smoke test in production**

Same as Step 3 but pointing at production. If production fails, roll back immediately using the rollback SQL.

---

## Self-review (completed)

Checked inline during writing:

- **Spec coverage.** Every section in the spec maps to at least one task: data model → Task 1, trigger → Task 1 Step 10, RLS policies → Task 1 Steps 7-9, application code changes (client + server) → Tasks 5-8, fork recipe → Task 10, testing → Tasks 3 + 9 + 11, rollback → Task 2. The Phase 2 outline in the spec deliberately has no tasks here (separate plan).
- **Placeholder scan.** No "TBD", "TODO", "implement later". One potentially vague step is Task 7 Step 7-9 ("repeat for forms / domains / branding") — this is acceptable because the pattern is shown fully in Steps 1-6 of the same task and the engineer is told to read each file first and mirror the pattern. The alternative (copy-pasting the same five steps four more times with different file names) would be worse DRY.
- **Type consistency.** `getActiveOrganisationId` (client) and `getActiveOrganisationIdAdmin` (server) are both defined in `src/lib/organisations.ts` (Task 6 + Task 8 Step 1). `activeOrgId` is the state variable name in Task 7; consistent across all three call sites.
- **Scope check.** All Phase 1 only. No Phase 2 invite flow, org switcher, or settings UI leaking in.

## Caveats / deviations from the skill defaults

- **TDD rigour is relaxed.** No test framework is installed and adding one (plus the test harness for Supabase) would multiply the size of this PR, delaying the security fix. Instead, the plan uses SQL assertions inside the migration (Task 1 Step 5) and a standalone Node smoke script (Task 9) as the regression net. Flag this as a follow-up: install vitest and port the smoke script into proper integration tests once the security patch is in.
- **No worktree.** This plan is designed to run on the current `main` branch; the user didn't request a worktree. If you want isolation, create a feature branch before starting Task 1: `git checkout -b feature/organisations-phase-1`.
