import { timingSafeEqual } from 'node:crypto'
import { Buffer } from 'node:buffer'
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { Roadmap } from '@/lib/supabase'

function constantTimeEquals(a: string, b: string): boolean {
  const bufA = Buffer.from(a, 'utf8')
  const bufB = Buffer.from(b, 'utf8')
  if (bufA.length !== bufB.length) return false
  return timingSafeEqual(bufA, bufB)
}

export type AuthoriseRoadmapResult =
  | { ok: true; roadmap: Roadmap }
  | { ok: false; response: NextResponse }

/**
 * Gate every `/api/roadmap/[slug]/*` sub-route through this helper. Mirrors
 * {@link authorisePublicView}; see that file for the threat-model rationale
 * around using `password_hash` as the cookie value.
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
      !constantTimeEquals(cookieValue, roadmap.password_hash)
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
    value: roadmap.password_hash,
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    // Scoped to the roadmap API surface so the cookie is not sent to unrelated
    // endpoints. The roadmap page itself renders via client fetches to
    // /api/roadmap/..., which receive the cookie as expected.
    path: '/api/roadmap/',
    maxAge: 60 * 60 * 24, // 24h
  })
}
