import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export async function POST(request: NextRequest) {
  try {
    const { apiToken, projectId } = await request.json() as { apiToken: string; projectId: string };

    if (!apiToken || !projectId) {
      return NextResponse.json(
        { error: 'Missing required fields: apiToken, projectId' },
        { status: 400 }
      );
    }

    // Get project updates from Linear using direct GraphQL request
    const query = `
      query ProjectUpdates($projectId: String!) {
        project(id: $projectId) {
          id
          name
          projectUpdates {
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
          }
        }
      }
    `;

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken.trim()
      },
      body: JSON.stringify({
        query,
        variables: { projectId }
      })
    });

    if (!response.ok) {
      let errorDetails = '';
      try {
        const errorBody = await response.text();
        errorDetails = ` - ${errorBody}`;
      } catch {
        // Ignore text parsing errors
      }
      throw new Error(`Linear API error: ${response.status} ${response.statusText}${errorDetails}`);
    }

    const result = await response.json() as {
      data?: {
        project: {
          id: string
          name: string
          projectUpdates: {
            nodes: Array<{
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
            }>
          }
        }
      }
      errors?: Array<{ message: string }>
    };

    if (result.errors) {
      throw new Error(`GraphQL errors: ${result.errors.map(e => e.message).join(', ')}`);
    }

    if (!result.data) {
      throw new Error('No data returned from Linear API');
    }

    return NextResponse.json({
      success: true,
      project: result.data.project,
      updates: result.data.project.projectUpdates.nodes
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
