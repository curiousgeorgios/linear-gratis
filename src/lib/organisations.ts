import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Resolve the active organisation id for the current user.
 *
 * Phase 1: every user has exactly one organisation (their personal org), so we
 * return the first membership. Phase 2 will replace this with a context-driven
 * active-org selection (URL-scoped or localStorage-backed).
 *
 * Callers must already have an authenticated session. If there are no
 * memberships, returns null and the caller should surface an error; that
 * shouldn't happen in practice because handle_new_user creates a personal org
 * atomically with the profile.
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

/**
 * Verify that a (user, organisation) pair has an active membership. Returns
 * true if the user can act on the org's resources. Used in API routes that
 * use the service-role client (RLS bypassed) and need to re-enforce the org
 * scope manually. Replaces the legacy "user_id = auth.uid()" checks that
 * incorrectly gated authority on the original creator.
 */
export async function assertOrgMember(
  admin: SupabaseClient,
  userId: string,
  organisationId: string,
): Promise<boolean> {
  const { data, error } = await admin
    .from('organisation_members')
    .select('organisation_id')
    .eq('user_id', userId)
    .eq('organisation_id', organisationId)
    .maybeSingle()
  if (error) {
    console.error('[organisations] assertOrgMember error:', error)
    return false
  }
  return Boolean(data)
}

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
