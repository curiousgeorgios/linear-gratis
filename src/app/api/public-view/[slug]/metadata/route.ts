import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation';
import { authorisePublicView } from '@/lib/public-view-auth';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

interface TriageState {
  id: string;
  name: string;
  type: string;
  color: string;
}

type LinearMetadataResponse = {
  errors?: unknown[];
  data?: {
    team?: {
      triageEnabled: boolean;
      triageIssueState: TriageState | null;
      states: { nodes: unknown[] };
    };
    project?: {
      teams: {
        nodes: {
          triageEnabled: boolean;
          triageIssueState: TriageState | null;
          states: { nodes: unknown[] };
        }[];
      };
    };
  };
};

async function fetchLinearMetadata(
  apiToken: string,
  options: { teamId?: string | null; projectId?: string | null },
): Promise<LinearMetadataResponse> {
  let query: string;
  let variables: Record<string, unknown>;

  if (options.teamId) {
    query = `
      query GetTeamMetadata($teamId: String!) {
        team(id: $teamId) {
          id
          name
          triageEnabled
          triageIssueState {
            id
            name
            type
            color
          }
          states {
            nodes {
              id
              name
              type
              color
            }
          }
        }
      }
    `;
    variables = { teamId: options.teamId };
  } else if (options.projectId) {
    query = `
      query GetProjectMetadata($projectId: String!) {
        project(id: $projectId) {
          id
          name
          teams(first: 10) {
            nodes {
              id
              name
              triageEnabled
              triageIssueState {
                id
                name
                type
                color
              }
              states {
                nodes {
                  id
                  name
                  type
                  color
                }
              }
            }
          }
        }
      }
    `;
    variables = { projectId: options.projectId };
  } else {
    throw new Error('Either teamId or projectId is required');
  }

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken.trim(),
    },
    body: JSON.stringify({ query, variables }),
  });

  return response.json() as Promise<LinearMetadataResponse>;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Auth first: is_active + expiry + password cookie. Metadata is used to
    // populate the new-issue modal so anyone who can see this endpoint could
    // see the team's workflow states, members and labels.
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;
    const viewData = auth.view;

    // Check if issue creation is allowed
    if (!viewData.allow_issue_creation) {
      return NextResponse.json(
        { error: 'Issue creation is not allowed for this view' },
        { status: 403 }
      );
    }

    // Get the user's Linear token
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', viewData.user_id)
      .single();

    if (profileError || !profileData?.linear_api_token) {
      return NextResponse.json(
        { error: 'Unable to load metadata - Linear API token not found' },
        { status: 500 }
      );
    }

    // Decrypt the token and fetch metadata directly from Linear
    const decryptedToken = await decryptAndRotateTokenIfNeeded(
      profileData.linear_api_token,
      { userId: viewData.user_id, admin: supabaseAdmin },
    );

    const data = await fetchLinearMetadata(decryptedToken, {
      teamId: viewData.team_id,
      projectId: viewData.project_id,
    });

    if (data.errors) {
      console.error('Linear API errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to fetch metadata', details: data.errors },
        { status: 400 }
      );
    }

    // Process the response to flatten project data if needed. Public issue
    // creation only needs workflow state hints; member and label metadata
    // would expose workspace internals and is intentionally not returned.
    let metadata: unknown = {};

    if (viewData.team_id && data.data?.team) {
      metadata = {
        states: data.data.team.states.nodes,
        users: [],
        labels: [],
        triageEnabled: data.data.team.triageEnabled,
        triageIssueState: data.data.team.triageIssueState,
      };
    } else if (viewData.project_id && data.data?.project) {
      const project = data.data.project;
      const allStates: unknown[] = [];

      const firstTeam = project.teams.nodes[0];
      const triageEnabled = firstTeam?.triageEnabled ?? false;
      const triageIssueState = firstTeam?.triageIssueState ?? null;

      project.teams.nodes.forEach((team) => {
        allStates.push(...team.states.nodes);
      });

      const uniqueStates = allStates.filter((state, index, self) =>
        index === self.findIndex((s) => (s as { id: string }).id === (state as { id: string }).id)
      );
      metadata = {
        states: uniqueStates,
        users: [],
        labels: [],
        triageEnabled,
        triageIssueState,
      };
    }

    return NextResponse.json({ success: true, metadata });

  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
