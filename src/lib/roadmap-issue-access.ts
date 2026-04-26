import { NextResponse } from 'next/server'
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation'
import { supabaseAdmin, type Roadmap } from '@/lib/supabase'

type ResolveRoadmapIssueResult =
  | { ok: true; issueId: string }
  | { ok: false; response: NextResponse }

export async function resolveRoadmapIssue(
  roadmap: Pick<Roadmap, 'user_id' | 'project_ids'>,
  requestedIssueId: string,
): Promise<ResolveRoadmapIssueResult> {
  if (!roadmap.project_ids || roadmap.project_ids.length === 0) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Roadmap has no projects configured' }, { status: 400 }),
    }
  }

  const { data: profile, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', roadmap.user_id)
    .single()

  if (profileError || !profile?.linear_api_token) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Unable to validate roadmap item' }, { status: 500 }),
    }
  }

  const linearToken = await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
    userId: roadmap.user_id,
    admin: supabaseAdmin,
  })

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
  if (result.errors || !issue?.project?.id || !roadmap.project_ids.includes(issue.project.id)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Roadmap item not found' }, { status: 404 }),
    }
  }

  return { ok: true, issueId: issue.id }
}
