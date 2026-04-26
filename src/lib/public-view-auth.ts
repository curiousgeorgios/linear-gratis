import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { PublicView } from '@/lib/supabase'
import {
  createPasswordAccessToken,
  verifyPasswordAccessToken,
} from '@/lib/access-cookie'

const PUBLIC_VIEW_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24

export type AuthorisePublicViewResult =
  | { ok: true; view: PublicView }
  | { ok: false; response: NextResponse }

/**
 * Gate every `/api/public-view/[slug]/*` sub-route through this helper.
 * It performs, in order:
 *   1. `is_active` + existence lookup (404 if missing / inactive).
 *   2. `expires_at` check (410 if expired).
 *   3. Password cookie check (401 `requiresPassword: true` if missing /
 *      mismatched). We check expiry BEFORE password so expired rows never
 *      run a bcrypt compare.
 *
 * Password access cookies are signed, scoped, and tied to the current
 * password hash fingerprint. The bcrypt hash itself is never sent to clients.
 */
export async function authorisePublicView(
  slug: string,
  request: NextRequest,
): Promise<AuthorisePublicViewResult> {
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 },
      ),
    }
  }

  const { data: view, error } = await supabaseAdmin
    .from('public_views')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !view) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Public view not found or inactive' },
        { status: 404 },
      ),
    }
  }

  if (view.expires_at && new Date(view.expires_at) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This public view has expired' },
        { status: 410 },
      ),
    }
  }

  if (view.password_protected) {
    const cookieName = publicViewAccessCookieName(view.id)
    const cookieValue = request.cookies.get(cookieName)?.value
    if (
      !cookieValue ||
      !view.password_hash ||
      !verifyPasswordAccessToken(cookieValue, view.id, view.password_hash)
    ) {
      return {
        ok: false,
        response: NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 },
        ),
      }
    }
  }

  return { ok: true, view: view as PublicView }
}

export function publicViewAccessCookieName(viewId: string): string {
  return `pv_access_${viewId}`
}

/** Set the per-view access cookie on an outgoing response. */
export function setPublicViewAccessCookie(
  response: NextResponse,
  view: Pick<PublicView, 'id' | 'password_hash'>,
): void {
  if (!view.password_hash) return
  response.cookies.set({
    name: publicViewAccessCookieName(view.id),
    value: createPasswordAccessToken(
      view.id,
      view.password_hash,
      PUBLIC_VIEW_ACCESS_MAX_AGE_SECONDS,
    ),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // Scoped to the public-view API surface so the cookie is not sent to
    // unrelated endpoints. The view page itself renders via client fetches
    // to /api/public-view/..., which receive the cookie as expected.
    path: '/api/public-view/',
    maxAge: PUBLIC_VIEW_ACCESS_MAX_AGE_SECONDS,
  })
}
