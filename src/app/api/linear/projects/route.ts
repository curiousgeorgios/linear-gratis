import { NextResponse } from 'next/server';
import { paginateLinearConnection, type LinearConnection } from '@/lib/linear';
import { getAuthenticatedLinearToken } from '@/lib/linear-auth';

type ProjectNode = {
  id: string
  name: string
  description?: string
  createdAt: string
}

export async function POST() {
  try {
    const auth = await getAuthenticatedLinearToken();
    if (!auth.ok) return auth.response;
    const { linearToken } = auth;

    const query = `
      query Projects($after: String) {
        projects(first: 250, after: $after) {
          nodes {
            id
            name
            description
            createdAt
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const result = await paginateLinearConnection<ProjectNode>({
      apiToken: linearToken,
      query,
      extract: (data) =>
        (data as { projects: LinearConnection<ProjectNode> }).projects,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const projects = result.nodes
      .map(project => ({
        id: project.id,
        name: project.name,
        description: project.description
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return NextResponse.json({ success: true, projects });

  } catch (error) {
    console.error('Projects API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
