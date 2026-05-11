import { NextResponse } from 'next/server'
import { supabaseAdmin, type Roadmap } from '@/lib/supabase'
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation'
import { getTokenForConnection } from '@/lib/linear-connection'

type ResolveRoadmapIssueResult =
  | { ok: true; issueId: string }
  | { ok: false; response: NextResponse }

/**
 * Verify the requested Linear issue belongs to one of the roadmap's configured
 * projects. Token resolution goes through the roadmap's linear_connection_id
 * post-Fix-E; falls back to the legacy profile token while the migrate window
 * is open and a roadmap's linear_connection_id is null.
 */
export async function resolveRoadmapIssue(
  roadmap: Pick<Roadmap, 'user_id' | 'linear_connection_id' | 'linear_project_ids' | 'project_ids'>,
  requestedIssueId: string,
): Promise<ResolveRoadmapIssueResult> {
  const projectIds = roadmap.linear_project_ids?.length
    ? roadmap.linear_project_ids
    : (roadmap.project_ids ?? [])
  if (projectIds.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Roadmap has no projects configured' }, { status: 400 }),
    }
  }

  const linearToken = await resolveTokenForRoadmap(roadmap)
  if (!linearToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unable to validate roadmap item' }, { status: 500 }),
    }
  }

  const query = `
    query RoadmapIssueAccess($issueId: String!) {
      issue(id: $issueId) {
        id
        project {
          id
        }
      }
    }
  `

  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: linearToken.trim(),
    },
    body: JSON.stringify({ query, variables: { issueId: requestedIssueId } }),
  })

  if (!response.ok) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unable to validate roadmap item' }, { status: 502 }),
    }
  }

  const result = (await response.json()) as {
    data?: { issue?: { id: string; project?: { id: string } | null } | null }
    errors?: Array<{ message: string }>
  }

  const issue = result.data?.issue
  if (result.errors || !issue?.project?.id || !projectIds.includes(issue.project.id)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 }),
    }
  }

  return { ok: true, issueId: issue.id }
}

async function resolveTokenForRoadmap(
  roadmap: Pick<Roadmap, 'user_id' | 'linear_connection_id'>,
): Promise<string | null> {
  if (roadmap.linear_connection_id) {
    return getTokenForConnection(roadmap.linear_connection_id)
  }

  // Legacy fallback while linear_connection_id is being backfilled: read the
  // token off the roadmap creator's profile. Removed in the contract.
  const { data: profile, error } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', roadmap.user_id)
    .single()
  if (error || !profile?.linear_api_token) return null
  try {
    return await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
      userId: roadmap.user_id,
      admin: supabaseAdmin,
    })
  } catch {
    return null
  }
}
