import { NextRequest, NextResponse } from 'next/server';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

interface MetadataRequest {
  apiToken: string;
  teamId?: string;
  projectId?: string;
}

export async function POST(request: NextRequest) {
  try {
    const { apiToken, teamId, projectId }: MetadataRequest = await request.json();

    if (!apiToken) {
      return NextResponse.json(
        { error: 'API token is required' },
        { status: 400 }
      );
    }

    let query: string;
    let variables: Record<string, unknown> = {};

    if (teamId) {
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
      variables = { teamId };
    } else if (projectId) {
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
      variables = { projectId };
    } else {
      return NextResponse.json(
        { error: 'Either teamId or projectId is required' },
        { status: 400 }
      );
    }


    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
      },
      body: JSON.stringify({
        query,
        variables
      }),
    });

    interface TriageState {
      id: string;
      name: string;
      type: string;
      color: string;
    }

    const data = await response.json() as {
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

    if (data.errors) {
      console.error('Linear API errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to fetch metadata', details: data.errors },
        { status: 400 }
      );
    }

    // Process the response to flatten project data if needed
    let metadata = {};

    if (teamId && data.data?.team) {
      metadata = {
        team: data.data.team,
        states: data.data.team.states.nodes,
        users: data.data.team.members.nodes,
        labels: data.data.team.labels.nodes,
        triageEnabled: data.data.team.triageEnabled,
        triageIssueState: data.data.team.triageIssueState,
      };
    } else if (projectId && data.data?.project) {
      // For projects, we need to aggregate data from all teams
      const project = data.data.project;
      const allStates: unknown[] = [];
      const allUsers: unknown[] = [];
      const allLabels: unknown[] = [];

      // Use first team's triage settings (for multi-team projects)
      const firstTeam = project.teams.nodes[0];
      const triageEnabled = firstTeam?.triageEnabled ?? false;
      const triageIssueState = firstTeam?.triageIssueState ?? null;

      project.teams.nodes.forEach((team: { states: { nodes: unknown[] }, members: { nodes: unknown[] }, labels: { nodes: unknown[] } }) => {
        allStates.push(...team.states.nodes);
        allUsers.push(...team.members.nodes);
        allLabels.push(...team.labels.nodes);
      });

      // Remove duplicates
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

    return NextResponse.json({
      success: true,
      metadata
    });

  } catch (error) {
    console.error('Error fetching metadata:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}