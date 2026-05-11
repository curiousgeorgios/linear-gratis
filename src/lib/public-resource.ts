// src/lib/public-resource.ts
// Cross-type slug routing helper (Fix F from ADR 0001).
//
// public_resources is the canonical entity behind every public slug. The
// extension tables (public_views, customer_request_forms, roadmaps) carry
// type-specific columns and FK back via public_resource_id.
//
// This helper centralises the three checks every public-facing slug route
// performs:
//   1. Slug lookup with is_active filter.
//   2. expires_at gate.
//   3. password_hash + cookie gate.
//
// Existing roadmap-auth.ts and public-view-auth.ts perform the same checks
// per-type. They remain in place for backwards compatibility and gradually
// migrate to this helper. New routes should prefer this entry point.
//
// Note: this helper deliberately does NOT load the extension row. Callers
// that need type-specific columns (form fields, roadmap config) should do
// the extension SELECT themselves using the returned resource.id /
// extension_id. Keeping the helper schema-shallow makes it useful across
// types without growing a discriminated union.

import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { supabaseAdmin } from '@/lib/supabase'
import type { PublicResource } from '@/lib/supabase'
import {
  createPasswordAccessToken,
  verifyPasswordAccessToken,
} from '@/lib/access-cookie'

const PUBLIC_RESOURCE_ACCESS_MAX_AGE_SECONDS = 60 * 60 * 24

export type RequirePublicAccessResult =
  | { ok: true; resource: PublicResource }
  | { ok: false; response: NextResponse }

/**
 * Resolve a slug to its public_resources row and enforce visibility gates.
 *
 * Order of checks matches the per-type helpers: existence and is_active
 * first, then expires_at (so expired rows never run a bcrypt compare), then
 * password. Returning a typed result lets callers branch on `ok` cleanly.
 */
export async function requirePublicAccess(
  slug: string,
  request: NextRequest,
  expectedType?: 'view' | 'form' | 'roadmap',
): Promise<RequirePublicAccessResult> {
  if (!slug) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Slug is required' }, { status: 400 }),
    }
  }

  const { data: resource, error } = await supabaseAdmin
    .from('public_resources')
    .select('id, type, organisation_id, slug, password_hash, expires_at, is_active, created_by, linear_connection_id, created_at, updated_at')
    .eq('slug', slug)
    .eq('is_active', true)
    .maybeSingle()

  if (error || !resource) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Resource not found or inactive' },
        { status: 404 },
      ),
    }
  }

  if (expectedType && resource.type !== expectedType) {
    // Slug exists but resolves to a different type. Return 404 rather than
    // 409 because the resource type isn't a client-correctable input here.
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Resource not found or inactive' },
        { status: 404 },
      ),
    }
  }

  if (resource.expires_at && new Date(resource.expires_at) < new Date()) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'This resource has expired' },
        { status: 410 },
      ),
    }
  }

  if (resource.password_hash) {
    const cookieName = publicResourceAccessCookieName(resource.id)
    const cookieValue = request.cookies.get(cookieName)?.value
    if (
      !cookieValue ||
      !verifyPasswordAccessToken(cookieValue, resource.id, resource.password_hash)
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

  return { ok: true, resource: resource as PublicResource }
}

export function publicResourceAccessCookieName(resourceId: string): string {
  return `pr_access_${resourceId}`
}

/**
 * Set the per-resource access cookie on an outgoing response. Scoped to
 * `/api/` since public_resources is consumed by multiple sub-routes
 * (form/view/roadmap), unlike the per-type helpers which scope to their own
 * sub-tree.
 */
export function setPublicResourceAccessCookie(
  response: NextResponse,
  resource: Pick<PublicResource, 'id' | 'password_hash'>,
): void {
  if (!resource.password_hash) return
  response.cookies.set({
    name: publicResourceAccessCookieName(resource.id),
    value: createPasswordAccessToken(
      resource.id,
      resource.password_hash,
      PUBLIC_RESOURCE_ACCESS_MAX_AGE_SECONDS,
    ),
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/api/',
    maxAge: PUBLIC_RESOURCE_ACCESS_MAX_AGE_SECONDS,
  })
}
