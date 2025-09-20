import { NextRequest, NextResponse } from 'next/server';

export const runtime = 'edge';

export type Team = {
  id: string
  name: string
  key: string
  description?: string
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

    console.log('Teams API - Token length:', apiToken.length, 'First 20 chars:', apiToken.substring(0, 20));

    // Get teams from Linear using GraphQL
    const query = `
      query Teams {
        teams {
          nodes {
            id
            name
            key
            description
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
      body: JSON.stringify({ query })
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
        teams: {
          nodes: Array<{
            id: string
            name: string
            key: string
            description?: string
          }>
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
      teams: result.data.teams.nodes.map(team => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description
      }))
    });

  } catch (error) {
    console.error('Teams API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}