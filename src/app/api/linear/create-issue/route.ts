import { NextRequest, NextResponse } from 'next/server';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

interface IssueCreateRequest {
  apiToken: string;
  title: string;
  description?: string;
  stateId?: string;
  priority?: number;
  assigneeId?: string;
  projectId?: string;
  teamId?: string;
  labelIds?: string[];
}

export async function POST(request: NextRequest) {
  try {
    const {
      apiToken,
      title,
      description,
      stateId,
      priority,
      assigneeId,
      projectId,
      teamId,
      labelIds
    }: IssueCreateRequest = await request.json();

    if (!apiToken || !title?.trim()) {
      return NextResponse.json(
        { error: 'API token and title are required' },
        { status: 400 }
      );
    }

    if (!teamId) {
      return NextResponse.json(
        { error: 'teamId is required' },
        { status: 400 }
      );
    }

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
            assignee {
              id
              name
              email
              displayName
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
        title: title.trim(),
        ...(description && { description }),
        ...(stateId && { stateId }),
        ...(priority !== undefined && { priority }),
        ...(assigneeId && { assigneeId }),
        ...(projectId && { projectId }),
        ...(teamId && { teamId }),
        ...(labelIds && labelIds.length > 0 && { labelIds }),
      }
    };

    const response = await fetch(LINEAR_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': apiToken,
      },
      body: JSON.stringify({
        query: mutation,
        variables
      }),
    });

    const data = await response.json() as {
      errors?: unknown[];
      data?: {
        issueCreate?: {
          success: boolean;
          issue: unknown;
        };
      };
    };

    if (data.errors) {
      console.error('Linear API errors:', data.errors);
      return NextResponse.json(
        { error: 'Failed to create issue', details: data.errors },
        { status: 400 }
      );
    }

    if (!data.data?.issueCreate?.success) {
      return NextResponse.json(
        { error: 'Failed to create issue' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      issue: data.data.issueCreate.issue
    });

  } catch (error) {
    console.error('Error creating issue:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}