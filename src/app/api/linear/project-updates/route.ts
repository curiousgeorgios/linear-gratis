import { NextRequest, NextResponse } from 'next/server';
import { paginateLinearConnection, type LinearConnection } from '@/lib/linear';
import { getAuthenticatedLinearToken } from '@/lib/linear-auth';

type ProjectUpdate = {
  id: string
  body: string
  createdAt: string
  editedAt?: string
  health: string
  user: {
    id: string
    name: string
    displayName: string
    avatarUrl?: string
    email: string
  }
  diff?: unknown
  diffMarkdown?: string
  isDiffHidden: boolean
  project: {
    id: string
    name: string
    progress: number
    state: string
  }
}

type ProjectWithUpdates = {
  id: string
  name: string
  projectUpdates: LinearConnection<ProjectUpdate>
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedLinearToken();
    if (!auth.ok) return auth.response;
    const { linearToken } = auth;

    const { projectId } = await request.json() as { projectId: string };

    if (!projectId) {
      return NextResponse.json(
        { error: 'Missing required field: projectId' },
        { status: 400 }
      );
    }

    const query = `
      query ProjectUpdates($projectId: String!, $after: String) {
        project(id: $projectId) {
          id
          name
          projectUpdates(first: 250, after: $after) {
            nodes {
              id
              body
              createdAt
              editedAt
              health
              user {
                id
                name
                displayName
                avatarUrl
                email
              }
              diff
              diffMarkdown
              isDiffHidden
              project {
                id
                name
                progress
                state
              }
            }
            pageInfo {
              hasNextPage
              endCursor
            }
          }
        }
      }
    `;

    // Capture project metadata from the first page so we can return it alongside the updates.
    let projectMeta: { id: string; name: string } | null = null;

    const result = await paginateLinearConnection<ProjectUpdate>({
      apiToken: linearToken,
      query,
      variables: { projectId },
      extract: (data) => {
        const project = (data as { project: ProjectWithUpdates }).project;
        if (!projectMeta) {
          projectMeta = { id: project.id, name: project.name };
        }
        return project.projectUpdates;
      },
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    return NextResponse.json({
      success: true,
      project: projectMeta,
      updates: result.nodes
    });

  } catch (error) {
    console.error('Project updates API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
