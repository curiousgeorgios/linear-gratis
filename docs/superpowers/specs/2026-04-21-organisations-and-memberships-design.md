# Organisations and memberships design

**Date:** 2026-04-21
**Status:** Draft (pre-implementation)
**Owner:** @curiousgeorgios

## Background

Pull request [#8](https://github.com/curiousgeorgios/linear-gratis/pull/8) ("feat: shared views, forms, domains and roadmaps across authenticated users") was merged on 2026-04-07. It ships migrations `011_shared_views.sql` and `012_shared_edit_delete.sql`, which open SELECT on five tables (`public_views`, `customer_request_forms`, `branding_settings`, `custom_domains`, `roadmaps`) to any authenticated user:

```sql
CREATE POLICY "Authenticated users can view all public_views" ON public_views
    FOR SELECT USING (auth.role() = 'authenticated');
```

UPDATE/DELETE were tightened back to the owner (`auth.uid() = user_id`) in the same PR, but SELECT remained global.

The contributor was building this for a single-tenant fork (Dude Agency, digitoimistodude) where "any authenticated user" is a sensible proxy for "any colleague". On linear.gratis, which is multi-tenant public SaaS, the policy lets any signed-up stranger read every other user's views (including bcrypt `password_hash` values on password-protected views), forms, branding settings, custom domains and roadmaps.

This design replaces the `auth.role()`-based policies with an explicit organisation membership model.

## Goals

1. Close the cross-tenant read leak on linear.gratis.
2. Preserve the intent of PR #8 (team-level sharing of resources) by making the "team" a first-class concept, not an implicit auth gate.
3. Support users belonging to multiple organisations (agency consultants sitting in client orgs) without forcing a schema change later.
4. Ship the security patch (Phase 1) in isolation from the team-workspaces UI (Phase 2), so the leak closes as soon as Phase 1 deploys.

## Non-goals

- Billing, plan tiers, or org-level quotas. Orgs are an access boundary only.
- Linear OAuth integration. Tokens remain per-user; views remember their creator for token lookup (same behaviour as today at `src/app/api/public-view/[slug]/route.ts:56`).
- Role matrix beyond owner/member. No admin, viewer, guest, or custom roles.
- Automated migration for self-hosters (e.g. Dude Agency's fork). They get a documented SQL recipe; running it is their responsibility.
- Cross-org resource sharing (e.g. "share this view with org X"). Out of scope, can be added later via an explicit grant table.

## Product decisions (previously agreed)

| # | Decision | Choice |
|---|----------|--------|
| 1 | User-to-org cardinality | N:M (users can belong to multiple orgs) |
| 2 | Linear API token location | Per-user, as today. Views store `created_by` (= existing `user_id`) and the render path uses that user's token. |
| 3 | Roles inside an org | `owner` + `member`. Both can CRUD resources; only `owner` can manage membership or delete the org. |
| 4 | Invite flow | Email invite with one-time token, `/invite/accept?token=...`. Handles logged-out and logged-in recipients. |
| 5 | Migration strategy | Every existing user gets a personal org auto-created; their existing resources stamped with that org's id. Forks get a documented SQL recipe for consolidating. |
| 6 | Rollout | Phased. Phase 1 closes the leak with zero visible UX change. Phase 2 ships invite/switcher/members UI. |

## Phase 1: security patch (this design)

### Data model

```sql
CREATE TYPE org_role AS ENUM ('owner', 'member');

CREATE TABLE organisations (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  slug        TEXT NOT NULL UNIQUE,
  created_by  UUID NOT NULL REFERENCES profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE organisation_members (
  organisation_id UUID NOT NULL REFERENCES organisations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES profiles(id)      ON DELETE CASCADE,
  role            org_role NOT NULL DEFAULT 'member',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (organisation_id, user_id)
);

CREATE INDEX idx_org_members_user ON organisation_members(user_id);
CREATE INDEX idx_orgs_created_by ON organisations(created_by);
```

On each of `public_views`, `customer_request_forms`, `branding_settings`, `custom_domains`, `roadmaps`:

```sql
ALTER TABLE <table>
  ADD COLUMN organisation_id UUID REFERENCES organisations(id) ON DELETE CASCADE;
CREATE INDEX idx_<table>_organisation_id ON <table>(organisation_id);
-- populate from data migration below, then:
ALTER TABLE <table> ALTER COLUMN organisation_id SET NOT NULL;
```

Notes on shape:

- `user_id` stays on every resource table as **creator**. The public-view render path looks up the creator's Linear token at `src/app/api/public-view/[slug]/route.ts:56`, and that semantics is preserved.
- `slug` on organisations is populated with `'u-' || substring(id::text, 1, 8)` during Phase 1 (it's never surfaced in the UI). Phase 2 replaces this with user-chosen slugs via the "create/rename organisation" flow.
- `role` is defined from Phase 1 but only `owner` is enforced. Both roles can CRUD resources. Phase 2 starts using `role = 'owner'` to gate invite/remove-member actions.

### Trigger changes

Extend `handle_new_user` (defined in migration `001`) to atomically create a personal organisation for every new signup. `CREATE OR REPLACE FUNCTION` replaces the body in place; the existing `on_auth_user_created` trigger already references the function by name and keeps firing, so no DDL change to the trigger itself is required.

```sql
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

Every future user has an org from the first moment they exist. No nullable `organisation_id` branches ever need to exist in the client.

### RLS

All Phase 1 policies follow the same pattern. For each resource table, the migration drops every pre-existing policy by its exact name before creating the new ones. Names come from migrations 002, 003, 005, 007, 010, 011, 012 (verified by reading each file).

#### Exact DROP list per table

```sql
-- public_views
DROP POLICY IF EXISTS "Authenticated users can view all public_views" ON public_views;  -- from 011
DROP POLICY IF EXISTS "Users can view own public_views"               ON public_views;  -- from 003
DROP POLICY IF EXISTS "Users can insert own public_views"             ON public_views;  -- from 003
DROP POLICY IF EXISTS "Users can update own public_views"             ON public_views;  -- from 003 / 012
DROP POLICY IF EXISTS "Users can delete own public_views"             ON public_views;  -- from 003 / 012

-- customer_request_forms
DROP POLICY IF EXISTS "Authenticated users can view all forms"        ON customer_request_forms;  -- from 011
DROP POLICY IF EXISTS "Users can view own forms"                      ON customer_request_forms;  -- from 002
DROP POLICY IF EXISTS "Users can insert own forms"                    ON customer_request_forms;  -- from 002
DROP POLICY IF EXISTS "Users can update own forms"                    ON customer_request_forms;  -- from 002 / 012
DROP POLICY IF EXISTS "Users can delete own forms"                    ON customer_request_forms;  -- from 002 / 012
-- NOT DROPPED (deliberate, see carve-outs below):
--   "Anyone can view active forms for submission"                    -- from 002, needed for public submit

-- branding_settings
DROP POLICY IF EXISTS "Authenticated users can view all branding settings" ON branding_settings;  -- from 011
DROP POLICY IF EXISTS "Users can view own branding settings"          ON branding_settings;  -- from 005
DROP POLICY IF EXISTS "Users can insert own branding settings"        ON branding_settings;  -- from 005
DROP POLICY IF EXISTS "Users can update own branding settings"        ON branding_settings;  -- from 005 / 012
DROP POLICY IF EXISTS "Users can delete own branding settings"        ON branding_settings;  -- from 005 / 012
-- NOT DROPPED (deliberate, see carve-outs below):
--   "Anyone can view branding settings for public access"            -- from 005, needed for public render

-- custom_domains
DROP POLICY IF EXISTS "Authenticated users can view all custom domains" ON custom_domains;  -- from 011
DROP POLICY IF EXISTS "Users can view own custom domains"             ON custom_domains;  -- from 007
DROP POLICY IF EXISTS "Users can insert own custom domains"           ON custom_domains;  -- from 007
DROP POLICY IF EXISTS "Users can update own custom domains"           ON custom_domains;  -- from 007 / 012
DROP POLICY IF EXISTS "Users can delete own custom domains"           ON custom_domains;  -- from 007 / 012
-- NOT DROPPED (deliberate, see carve-outs below):
--   "Anyone can view verified active custom domains"                 -- from 007, needed for hostname routing

-- roadmaps
DROP POLICY IF EXISTS "Authenticated users can view all roadmaps"     ON roadmaps;  -- from 011
DROP POLICY IF EXISTS "Users can view own roadmaps"                   ON roadmaps;  -- from 010
DROP POLICY IF EXISTS "Users can insert own roadmaps"                 ON roadmaps;  -- from 010
DROP POLICY IF EXISTS "Users can update own roadmaps"                 ON roadmaps;  -- from 010 / 012
DROP POLICY IF EXISTS "Users can delete own roadmaps"                 ON roadmaps;  -- from 010 / 012
```

Missing any DROP here means the old permissive policy remains active alongside the new member-scoped policy. Permissive policies are OR'd, so a stale `USING (auth.uid() = user_id)` or `USING (auth.role() = 'authenticated')` would defeat the fix. The list above is exhaustive for the five target tables.

#### Pre-existing "Anyone can view" carve-outs (deliberately preserved)

Three world-readable policies remain in place because downstream product features require them:

| Policy | Table | Reason kept |
|--------|-------|-------------|
| `Anyone can view active forms for submission` (USING `is_active = true`) | `customer_request_forms` | Anonymous submitters need to fetch the form config to render the submit page. |
| `Anyone can view branding settings for public access` (USING `true`) | `branding_settings` | Public view / form / roadmap render paths read owner branding anonymously. |
| `Anyone can view verified active custom domains` (USING `verification_status = 'verified' AND is_active = true`) | `custom_domains` | Edge routing resolves hostnames to their target without an auth context. |

The `USING (true)` on `branding_settings` is broader than necessary (it exposes columns beyond logo/colors to any anonymous caller). Narrowing it is logged as a Phase 2 follow-up, not a Phase 1 blocker, because (a) it predates PR #8, (b) its columns don't contain credentials, and (c) tightening it risks breaking the public render path without extra server-side work first. Noted in "Open questions" below.

#### Policy template (per resource table)

```sql
CREATE POLICY "Members can view <table> in their orgs" ON <table>
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can insert <table> into their orgs" ON <table>
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can update <table> in their orgs" ON <table>
  FOR UPDATE
  USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Members can delete <table> in their orgs" ON <table>
  FOR DELETE USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );
```

RLS on the new tables:

```sql
ALTER TABLE organisations        ENABLE ROW LEVEL SECURITY;
ALTER TABLE organisation_members ENABLE ROW LEVEL SECURITY;

-- organisations
CREATE POLICY "Members can view their orgs" ON organisations
  FOR SELECT USING (
    id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())
  );

CREATE POLICY "Authenticated users can create orgs" ON organisations
  FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners can update their orgs" ON organisations
  FOR UPDATE USING (
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

-- organisation_members
CREATE POLICY "Members can view co-members" ON organisation_members
  FOR SELECT USING (
    organisation_id IN (
      SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()
    )
  );

-- INSERT/UPDATE/DELETE on organisation_members: no policies in Phase 1.
-- Memberships are created only by (a) the migration seeding, (b) handle_new_user trigger,
-- both of which use SECURITY DEFINER context and bypass RLS.
-- Phase 2 adds owner-only policies for invite accept / remove member flows.
```

### Data migration

Single SQL migration `015_organisations.sql`. All operations wrapped in one transaction.

1. Create `org_role` enum, `organisations` table, `organisation_members` table, indexes.
2. Add nullable `organisation_id` column + index to each of the five resource tables.
3. Seed one organisation per existing profile. Slug is derived from the **profile UUID** (which already has a UNIQUE constraint upstream) to guarantee no collision. We use the first 16 hex chars of the UUID rather than the full 36-char text to keep slugs short; collision probability across the full UUID space is negligible, and `CREATE UNIQUE INDEX` on `slug` would abort the migration transactionally if one ever occurred. The slug is never surfaced in the Phase 1 UI, so legibility doesn't matter.
   ```sql
   INSERT INTO organisations (id, name, slug, created_by)
   SELECT
     gen_random_uuid(),
     COALESCE(NULLIF(split_part(email, '@', 1), ''), 'workspace') || '''s workspace',
     'u-' || replace(substring(id::text, 1, 18), '-', ''),
     id
   FROM profiles;
   ```
4. Add each user as owner of their personal org:
   ```sql
   INSERT INTO organisation_members (organisation_id, user_id, role)
   SELECT id, created_by, 'owner' FROM organisations;
   ```
5. Stamp every resource row with its owner's org:
   ```sql
   UPDATE public_views v
     SET organisation_id = o.id
     FROM organisations o
     WHERE o.created_by = v.user_id;
   -- repeat for customer_request_forms, branding_settings, custom_domains, roadmaps
   ```
6. Assert no null `organisation_id` remain on any resource table, then `SET NOT NULL`:
   ```sql
   DO $$
   DECLARE orphan_count INT;
   BEGIN
     SELECT COUNT(*) INTO orphan_count FROM public_views WHERE organisation_id IS NULL;
     IF orphan_count > 0 THEN RAISE EXCEPTION 'public_views has % orphan rows', orphan_count; END IF;
     -- repeat per table
   END $$;
   ```
7. Drop the PR-#8 "authenticated can read all" policies on all five tables. Install the member-scoped policies from the RLS section above.
8. Replace `handle_new_user` with the org-creating version shown above.

The migration aborts cleanly on any assertion failure, leaving the database untouched.

### Application code changes (Phase 1)

Client-side changes are minimal because RLS does the work. Server-side routes need more attention because several use `supabaseAdmin`, which bypasses RLS entirely. Line numbers are current as of commit `d77c950`.

#### Client-side (Supabase-authed browser queries)

- **`src/app/views/page.tsx:120`** — the list query stays `select("*").order(...)`; RLS restricts it to rows in the caller's org. Drop the `view.user_id === user?.id` check at line `1419` (every visible row is now in the caller's active org, every member can edit/delete per Phase 1 model). Heading "Your public views" (line `1346`) stays for Phase 1; Phase 2 relabels.
- **`src/app/views/page.tsx:262` (create), `:491` (update)** — include `organisation_id: activeOrgId` in the insert/update payload. Resolve `activeOrgId` once per page load by querying `organisation_members` for the current user and taking the first row (Phase 1 has exactly one org per user; Phase 2 replaces this with an active-org context).
- **`src/app/forms/page.tsx`** — same pattern as views: drop ownership UI gates, include `organisation_id` on insert/update.
- **`src/app/profile/domains/page.tsx`** — same pattern for client-side reads (if any; most domain mutations flow through the API routes below).
- **`src/lib/supabase.ts`** — add `Organisation` and `OrganisationMember` types; extend `PublicView`, `CustomerRequestForm`, `BrandingSettings`, `CustomDomain`, `Roadmap` with `organisation_id: string`.

#### Server-side API routes

Full audit of every `supabaseAdmin` call site in `src/app/api/` that touches one of the five tables, with the required Phase 1 change. Routes not listed (e.g. `src/app/api/metrics/public/route.ts`) were verified to either not touch the tables in a tenant-scoped way or to already aggregate safely.

| File | Current behaviour | Required change |
|------|-------------------|-----------------|
| `src/app/api/domains/route.ts:13` (GET) | `supabaseAdmin.from('custom_domains').select('*')` with **no filter** — returns every user's domains. **This is a live cross-tenant read leak independent of the Supabase client** because `supabaseAdmin` bypasses RLS. | Add `.eq('user_id', user.id)` (or equivalently `.in('organisation_id', memberOrgIds)` once orgs exist). Critical security fix. |
| `src/app/api/domains/route.ts:POST` | Creates a domain row scoped to `user.id`. | Also write `organisation_id: activeOrgId` on INSERT. `organisation_id` becomes NOT NULL after step 6 of the data migration, so this is a functional requirement, not just best practice. |
| `src/app/api/domains/[domainId]/route.ts` (GET / PATCH / DELETE) | Already filters by `.eq('user_id', user.id)`. | No read-path change needed for Phase 1; in Phase 2 swap the filter to org-membership scoped. |
| `src/app/api/domains/[domainId]/verify/route.ts` | Admin-contextual writes to `custom_domains`. | No change; write path is an owner-only mutation and the user-scoped lookup at the top of the handler still holds. |
| `src/app/api/roadmaps/route.ts:16` (GET) | `supabaseAdmin.from('roadmaps').select('*')` with no filter — returns every roadmap. **Live cross-tenant read leak.** | Add `.eq('user_id', user.id)`. Critical security fix. |
| `src/app/api/roadmaps/route.ts:POST` | Creates a roadmap scoped to `user.id`. | Also write `organisation_id: activeOrgId` on INSERT (NOT NULL enforced after migration). |
| `src/app/api/roadmaps/[id]/route.ts` (GET / PATCH / DELETE) | Already filters by `.eq('user_id', user.id)`. | No read-path change for Phase 1. |
| `src/app/api/branding/route.ts:43` (GET) | Already filters by `.eq('user_id', user.id)`. | No change for Phase 1. |
| `src/app/api/branding/route.ts:POST` (INSERT branch, line `111`) | Creates branding scoped to `user.id` but does **not** write `organisation_id`. | Write `organisation_id: activeOrgId` on INSERT. Without this the migration's NOT NULL constraint will cause every new branding create to fail. |
| `src/app/api/branding/route.ts:POST` (UPDATE branch, line `84`) | Already filters by `.eq('user_id', user.id)`. | No change needed — existing rows keep their `organisation_id` from the data migration. |
| `src/app/api/branding/route.ts:DELETE` | Already filters by `.eq('user_id', user.id)`. | No change. |
| `src/app/api/branding/upload-logo/route.ts` | Writes to storage only, no tenant table. | No change. |
| `src/app/api/public-view/[slug]/**` (all four routes) | Read `public_views` by slug, then `profiles.linear_api_token` by `viewData.user_id`. | No change. The creator-based token lookup at `route.ts:56` is preserved. |

The two routes marked "live read leak" (`/api/domains` GET and `/api/roadmaps` GET) MUST be patched in the same PR as the migration, ideally before the migration lands, because they bypass RLS entirely and the new RLS policies will not stop them. They are not new bugs introduced by Phase 1; they were leaks before this work began. We're fixing them opportunistically because we're already touching the area.

Memo: as a principle for Phase 2 and beyond, new API routes should prefer the per-user Supabase client (`createClient` from `@/lib/supabase/server`) over `supabaseAdmin`. `supabaseAdmin` should be reserved for operations that legitimately need to bypass RLS (e.g. resolving a public view by slug anonymously, where there's no authenticated user). Add this to the PR description as a maintenance note for reviewers.

### Fork recipe (documented in the PR body)

For self-hosters (Dude Agency and any other fork) whose users expect to keep seeing each other's resources, a 4-line SQL recipe that consolidates all personal orgs into one shared org:

```sql
-- 1. Create the shared organisation
INSERT INTO organisations (id, name, slug, created_by)
VALUES (gen_random_uuid(), 'Team', 'team', (SELECT id FROM profiles ORDER BY created_at LIMIT 1));

-- 2. Add every existing user as a member of that org (first user becomes owner)
INSERT INTO organisation_members (organisation_id, user_id, role)
SELECT
  (SELECT id FROM organisations WHERE slug = 'team'),
  id,
  CASE WHEN id = (SELECT id FROM profiles ORDER BY created_at LIMIT 1) THEN 'owner'::org_role ELSE 'member'::org_role END
FROM profiles;

-- 3. Point every resource at the shared org
UPDATE public_views          SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE customer_request_forms SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE branding_settings      SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE custom_domains         SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');
UPDATE roadmaps               SET organisation_id = (SELECT id FROM organisations WHERE slug = 'team');

-- 4. Drop every org that no longer has resources attached (i.e. the now-empty personal orgs).
--    The shared 'team' org is exempt because it has resources pointing at it after step 3.
--    `ON DELETE CASCADE` on organisation_members drops the orphan personal-org membership rows;
--    it does NOT touch profiles or the 'team' org's membership rows (those reference a different
--    organisation_id). Verified before running this recipe in production.
DELETE FROM organisations o
  WHERE NOT EXISTS (SELECT 1 FROM public_views WHERE organisation_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM customer_request_forms WHERE organisation_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM branding_settings WHERE organisation_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM custom_domains WHERE organisation_id = o.id)
    AND NOT EXISTS (SELECT 1 FROM roadmaps WHERE organisation_id = o.id);
```

This lives in the PR body and an appendix to the README, not in the migration.

### Testing strategy (Phase 1)

- **Local migration test.** Run `015_organisations.sql` against a Supabase local copy seeded with at least two profiles, each with rows in all five resource tables. Assert post-migration invariants:
  - Every profile has exactly one organisation via `organisations.created_by`.
  - Every resource row has a non-null `organisation_id` pointing to an org its `user_id` is a member of.
- **Migration is apply-once, not idempotent.** Re-running it after a successful apply would try to re-INSERT personal orgs and fail the `slug UNIQUE` constraint; the transaction would roll back cleanly but still surface a confusing error. Because we go through `wrangler d1 migrations apply` / Supabase's migration tracker, the tracker prevents double-application in normal operation. The testing requirement is: "a failed run leaves no side effects", not "a successful run can be replayed". Aborted runs are verified to leave the database in its pre-migration state by wrapping the entire migration in a single `BEGIN ... COMMIT` transaction (Supabase migrations run transactionally by default; reaffirm with `BEGIN;` / `COMMIT;` sentinels in the file).
- **Trigger test.** Insert a row into `auth.users`; assert a profile, an organisation, and an `organisation_members` row with `role = 'owner'` all appear.
- **RLS integration test.** Two test users, each with public views. From user A's Supabase-authed client, `select("*").from("public_views")` returns only A's rows. Repeat for all five tables. Repeat for INSERT with a mismatched `organisation_id` (should fail).
- **Smoke test in staging.** Sign in as a real test user; confirm the `/views` page shows only their rows and "Your public views" count matches pre-deploy.
- **Regression coverage.** Add Playwright or vitest integration tests (whichever is already wired) for the two-users-don't-see-each-other case per table.

### Rollback

Companion file `015_organisations_rollback.sql` checked into the repo (not registered as a wrangler/supabase migration). Drops policies, drops `organisation_id` columns, drops `organisation_members`, drops `organisations`, drops the enum, reinstates the owner-scoped policies from migration `003`. Run manually only if a critical issue surfaces post-deploy that can't be hot-fixed.

## Phase 2: team workspaces (outline only)

Detailed design after Phase 1 ships. Rough shape:

- **`organisation_invites` table:** `(id, organisation_id, email, token, invited_by, expires_at, accepted_at, created_at)` with an index on `(token)`.
- **API routes:**
  - `POST /api/organisations` — create new org (caller becomes owner).
  - `POST /api/organisations/[id]/invites` — owner-only; generates token, sends email (via Supabase's existing auth email channel or a Resend/Postmark integration).
  - `GET /invite/accept?token=...` — page that either redirects to login/signup (preserving token) or calls `POST /api/invites/accept` and drops the user on the org they just joined.
  - `DELETE /api/organisations/[id]/members/[userId]` — owner-only.
- **RLS additions:**
  - INSERT on `organisation_members`: only via a SECURITY DEFINER RPC called by the accept-invite endpoint. No direct insert policy.
  - DELETE on `organisation_members`: owner, OR the member removing themselves.
- **Active org selection.** Two options, decided in Phase 2 design:
  - **(2a) URL-scoped**, e.g. `/org/[slug]/views`. Deeper refactor but cleaner mental model.
  - **(2b) `localStorage`-backed `active_org_id`**, sent via a custom header or as a query filter on every Supabase request. Matches Linear.app's workspace switcher. Less refactor.
- **UI:**
  - Org switcher dropdown in `src/components/navigation.tsx`.
  - `/org/settings/members` page with members list, role badges, invite form, remove action.
  - "Create organisation" entry point under `/profile`.
  - Relabel "Your [resource]" → "Organisation [resource]" across the five resource pages.

Any of these can change in the Phase 2 brainstorming cycle; the schema in Phase 1 is deliberately the minimum that doesn't preclude them.

## Open questions

None blocking Phase 1. The following are deliberately deferred:

- How to surface "you're a member of multiple orgs" in the UI (switcher vs URL-scoping). Phase 2.
- Whether to ship a bulk-invite flow or one-at-a-time in Phase 2's first iteration.
- Whether the fork recipe should become a first-class self-host config (e.g. env flag `DEFAULT_SHARED_ORG=true` that makes `handle_new_user` add new users to an existing shared org instead of creating a personal one). Not needed for linear.gratis; possibly useful for Dude Agency if they ask.
- **Narrowing the `USING (true)` carve-out on `branding_settings`.** The public render paths that rely on it are server-side and could be moved onto `supabaseAdmin` with explicit `organisation_id` filters, at which point the anonymous policy could be dropped entirely or narrowed to `organisation_id IN (SELECT ... active resources)`. Phase 2 hardening item — requires auditing every client-side read of `branding_settings` first.

## Risks and mitigations

| Risk | Mitigation |
|------|------------|
| Phase 1 migration fails mid-run and leaves inconsistent state | Whole migration in a single transaction; assertion block aborts on orphans. Rollback SQL kept in repo. |
| `supabaseAdmin` routes bypass RLS and still leak data | Defence-in-depth: before mutating, verify `organisation_id` on the target row is in the caller's membership list. |
| Phase 2 recursive RLS on `organisation_members` is slow | Benchmark on a 10k-member dataset before Phase 2 lands. If slow, replace subquery with a `SECURITY DEFINER` function `is_org_member(org_id uuid, user_id uuid)` (memo'd per request). |
| Dude Agency deploys Phase 1 without running the fork recipe and their team loses shared view | Call this out explicitly in the PR body and release note; link the recipe. Their fork, their responsibility. |
| Users with no profile row (somehow) cause migration to create 0 orgs | Assertion block also verifies `(SELECT COUNT(*) FROM organisations) >= (SELECT COUNT(*) FROM profiles)`. |
| `supabaseAdmin`-based API routes bypass RLS and defeat the new policies | Application code audit table in "Application code changes" catalogues every call site. Two live leaks (`GET /api/domains`, `GET /api/roadmaps`) are patched in the same PR as the migration. INSERT-path routes are updated to write `organisation_id` so the NOT NULL constraint doesn't break them. |
| `INSERT` policies from the original migrations (e.g. `"Users can insert own public_views"`) are not explicitly DROPed and silently remain in place alongside the new ones | DROP list in the RLS section enumerates every policy by name, referenced by the migration they came from (002, 003, 005, 007, 010, 011, 012). Verified exhaustively via grep. |
| `slug UNIQUE` collision during seed aborts the whole migration | Slug derived from the profile UUID's first 16 hex chars (UUID itself is unique; collision probability across the full UUID space is negligible). If it ever fires, the whole transaction rolls back; nothing partial lands. |
