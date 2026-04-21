import { NextRequest, NextResponse } from 'next/server';
import { paginateLinearConnection, type LinearConnection } from '@/lib/linear';
import { getAuthenticatedLinearToken } from '@/lib/linear-auth';

export type Team = {
  id: string
  name: string
  key: string
  description?: string
}

type TeamNode = Team;

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedLinearToken(request);
    if (!auth.ok) return auth.response;
    const { linearToken } = auth;

    const query = `
      query Teams($after: String) {
        teams(first: 250, after: $after) {
          nodes {
            id
            name
            key
            description
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const result = await paginateLinearConnection<TeamNode>({
      apiToken: linearToken,
      query,
      extract: (data) =>
        (data as { teams: LinearConnection<TeamNode> }).teams,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const teams = result.nodes
      .map(team => ({
        id: team.id,
        name: team.name,
        key: team.key,
        description: team.description
      }))
      .sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }));

    return NextResponse.json({ success: true, teams });

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
