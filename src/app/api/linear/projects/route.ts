import { NextRequest, NextResponse } from 'next/server';
import { paginateLinearConnection, type LinearConnection } from '@/lib/linear';

type ProjectNode = {
  id: string
  name: string
  description?: string
  createdAt: string
}

export async function POST(request: NextRequest) {
  try {
    const { apiToken } = await request.json() as { apiToken: string };

    if (!apiToken) {
      return NextResponse.json(
        { error: 'Missing required field: apiToken' },
        { status: 400 }
      );
    }

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
      apiToken,
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
