import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

interface IssueCreateRequest {
  title: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
  labelIds?: string[];
}

interface WorkflowState {
  id: string;
  name: string;
  type: string;
  color: string;
}

// Fetch team metadata directly from Linear API
async function fetchTeamMetadata(apiToken: string, teamId: string) {
  const query = `
    query TeamMetadata($teamId: String!) {
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

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken,
    },
    body: JSON.stringify({ query, variables: { teamId } }),
  });

  const data = await response.json() as {
    data?: {
      team?: {
        triageEnabled?: boolean;
        triageIssueState?: WorkflowState;
        states?: { nodes: WorkflowState[] };
      };
    };
  };

  return data.data?.team;
}

// Create issue directly via Linear API
async function createLinearIssue(
  apiToken: string,
  input: {
    title: string;
    description?: string;
    stateId?: string;
    priority?: number;
    projectId?: string;
    teamId: string;
    labelIds?: string[];
  }
) {
  const mutation = `
    mutation IssueCreate($input: IssueCreateInput!) {
      issueCreate(input: $input) {
        success
        issue {
          id
          identifier
          title
          description
          priority
          state {
            id
            name
            type
            color
          }
          team {
            id
            name
            key
          }
          project {
            id
            name
          }
          labels {
            nodes {
              id
              name
              color
            }
          }
          createdAt
          updatedAt
        }
      }
    }
  `;

  const variables = {
    input: {
      title: input.title.trim(),
      ...(input.description && { description: input.description }),
      ...(input.stateId && { stateId: input.stateId }),
      ...(input.priority !== undefined && { priority: input.priority }),
      ...(input.projectId && { projectId: input.projectId }),
      teamId: input.teamId,
      ...(input.labelIds && input.labelIds.length > 0 && { labelIds: input.labelIds }),
    },
  };

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken,
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  return response.json() as Promise<{
    errors?: unknown[];
    data?: {
      issueCreate?: {
        success: boolean;
        issue: unknown;
      };
    };
  }>;
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const issueData: IssueCreateRequest = await request.json();

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

    if (!viewData.team_id) {
      return NextResponse.json(
        { error: 'View has no team configured' },
        { status: 400 }
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
        { error: 'Unable to create issue - Linear API token not found' },
        { status: 500 }
      );
    }

    // Decrypt the token
    const decryptedToken = decryptToken(profileData.linear_api_token);

    // Fetch team metadata directly from Linear API
    const teamMetadata = await fetchTeamMetadata(decryptedToken, viewData.team_id);

    // Determine the correct state for public issue creation
    // Priority: 1) Triage state if enabled, 2) First unstarted state, 3) First available state
    let finalStateId: string | undefined = undefined;

    if (teamMetadata?.triageEnabled && teamMetadata?.triageIssueState) {
      // Force triage state when triage is enabled
      finalStateId = teamMetadata.triageIssueState.id;
    } else if (teamMetadata?.states?.nodes) {
      // Fall back to unstarted state
      const unstartedState = teamMetadata.states.nodes.find(
        (s: WorkflowState) => s.type === 'unstarted'
      );
      if (unstartedState) {
        finalStateId = unstartedState.id;
      } else if (teamMetadata.states.nodes.length > 0) {
        // Last resort: use first available state
        finalStateId = teamMetadata.states.nodes[0].id;
      }
    }

    // Create the issue with enforced restrictions
    // Note: priority and assigneeId are intentionally not passed for public views
    const result = await createLinearIssue(decryptedToken, {
      title: issueData.title,
      description: issueData.description,
      stateId: finalStateId, // Enforced triage/unstarted state
      priority: 0, // Default to no priority for public views
      projectId: viewData.project_id,
      teamId: viewData.team_id,
      labelIds: issueData.labelIds,
    });

    if (result.errors) {
      console.error('Linear API errors:', result.errors);
      return NextResponse.json(
        { error: 'Failed to create issue', details: result.errors },
        { status: 400 }
      );
    }

    if (!result.data?.issueCreate?.success) {
      return NextResponse.json(
        { error: 'Failed to create issue' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      issue: result.data.issueCreate.issue,
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}