import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Roadmap } from '@/lib/supabase'
import {
  createPasswordAccessToken,
  verifyPasswordAccessToken,
} from '@/lib/access-cookie'

const ROADMAP_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24

export type AuthoriseRoadmapResult =
  | { ok: true; roadmap: Roadmap }
  | { ok: false; response: NextResponse }

/**
 * Gate every `/api/roadmap/[slug]/*` sub-route through this helper.
 */
export async function authoriseRoadmap(
  slug: string,
  request: NextRequest,
): Promise<AuthoriseRoadmapResult> {
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Slug is required' },
        { status: 400 },
      ),
    }
  }

  const { data: roadmap, error } = await supabaseAdmin
    .from('roadmaps')
    .select('*')
    .eq('slug', slug)
    .eq('is_active', true)
    .single()

  if (error || !roadmap) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Roadmap not found or inactive' },
        { status: 404 },
      ),
    }
  }

  if (roadmap.expires_at && new Date(roadmap.expires_at) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This roadmap has expired' },
        { status: 410 },
      ),
    }
  }

  if (roadmap.password_protected) {
    const cookieName = roadmapAccessCookieName(roadmap.id)
    const cookieValue = request.cookies.get(cookieName)?.value
    if (
      !cookieValue ||
      !roadmap.password_hash ||
      !verifyPasswordAccessToken(cookieValue, roadmap.id, roadmap.password_hash)
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

  return { ok: true, roadmap: roadmap as Roadmap }
}

export function roadmapAccessCookieName(roadmapId: string): string {
  return `rm_access_${roadmapId}`
}

/** Set the per-roadmap access cookie on an outgoing response. */
export function setRoadmapAccessCookie(
  response: NextResponse,
  roadmap: Pick<Roadmap, 'id' | 'password_hash'>,
): void {
  if (!roadmap.password_hash) return
  response.cookies.set({
    name: roadmapAccessCookieName(roadmap.id),
    value: createPasswordAccessToken(
      roadmap.id,
      roadmap.password_hash,
      ROADMAP_ACCESS_MAX_AGE_SECONDS,
    ),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // Scoped to the roadmap API surface so the cookie is not sent to unrelated
    // endpoints. The roadmap page itself renders via client fetches to
    // /api/roadmap/..., which receive the cookie as expected.
    path: '/api/roadmap/',
    maxAge: ROADMAP_ACCESS_MAX_AGE_SECONDS,
  })
}
