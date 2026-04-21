-- 016_fix_organisation_members_rls.sql
-- Fix the self-referential SELECT policy on organisation_members from migration 015.
--
-- The old policy:
--   USING (organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid()))
-- references the same table inside its own USING clause. Postgres applies RLS
-- to the inner subquery (which re-evaluates the same recursive policy), so
-- every authenticated call to `.from('organisation_members').select(...)`
-- silently returned zero rows. This made `getActiveOrganisationId` always
-- resolve to null, which disabled the Create button across /views, /forms
-- and /profile/domains for every user, even though each user correctly had
-- a personal org and an owner membership from migration 015's seed.
--
-- It also broke SELECTs on the five resource tables, whose policies contain
-- `organisation_id IN (SELECT organisation_id FROM organisation_members WHERE user_id = auth.uid())`:
-- the subquery went through the same broken policy and returned empty.
--
-- Fix: restrict SELECT to the caller's own membership rows. This is the
-- standard Supabase idiom and is all Phase 1 needs (getActiveOrganisationId
-- and the resource-table policy subqueries only ever read the caller's own
-- memberships). Phase 2's members-management UI will add co-member visibility
-- via a separate policy or a SECURITY DEFINER helper at that point.

DROP POLICY IF EXISTS "Members can view co-members" ON organisation_members;

CREATE POLICY "Users can view their own memberships" ON organisation_members
  FOR SELECT USING (user_id = auth.uid());
