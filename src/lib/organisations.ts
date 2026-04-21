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
