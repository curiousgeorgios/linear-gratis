import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';

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
      members: { nodes: { active: boolean }[] };
      labels: { nodes: unknown[] };
    };
    project?: {
      teams: {
        nodes: {
          triageEnabled: boolean;
          triageIssueState: TriageState | null;
          states: { nodes: unknown[] };
          members: { nodes: { active: boolean }[] };
          labels: { nodes: unknown[] };
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
          members(first: 50, filter: { active: { eq: true } }) {
            nodes {
              id
              displayName
              avatarUrl
              active
            }
          }
          labels(first: 50) {
            nodes {
              id
              name
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
              members(first: 50, filter: { active: { eq: true } }) {
                nodes {
                  id
                  displayName
                  avatarUrl
                  active
                }
              }
              labels(first: 50) {
                nodes {
                  id
                  name
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
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    // Get the public view
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('public_views')
      .select('*')
      .eq('slug', slug)
      .single();

    if (viewError || !viewData) {
      return NextResponse.json(
        { error: 'View not found' },
        { status: 404 }
      );
    }

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
    const decryptedToken = decryptToken(profileData.linear_api_token);

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

    // Process the response to flatten project data if needed
    let metadata: unknown = {};

    if (viewData.team_id && data.data?.team) {
      metadata = {
        team: data.data.team,
        states: data.data.team.states.nodes,
        users: data.data.team.members.nodes,
        labels: data.data.team.labels.nodes,
        triageEnabled: data.data.team.triageEnabled,
        triageIssueState: data.data.team.triageIssueState,
      };
    } else if (viewData.project_id && data.data?.project) {
      const project = data.data.project;
      const allStates: unknown[] = [];
      const allUsers: unknown[] = [];
      const allLabels: unknown[] = [];

      const firstTeam = project.teams.nodes[0];
      const triageEnabled = firstTeam?.triageEnabled ?? false;
      const triageIssueState = firstTeam?.triageIssueState ?? null;

      project.teams.nodes.forEach((team) => {
        allStates.push(...team.states.nodes);
        allUsers.push(...team.members.nodes);
        allLabels.push(...team.labels.nodes);
      });

      const uniqueStates = allStates.filter((state, index, self) =>
        index === self.findIndex((s) => (s as { id: string }).id === (state as { id: string }).id)
      );
      const uniqueUsers = allUsers.filter((user, index, self) =>
        index === self.findIndex((u) => (u as { id: string }).id === (user as { id: string }).id)
      );
      const uniqueLabels = allLabels.filter((label, index, self) =>
        index === self.findIndex((l) => (l as { id: string }).id === (label as { id: string }).id)
      );

      metadata = {
        project,
        states: uniqueStates,
        users: uniqueUsers,
        labels: uniqueLabels,
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
