import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation';
import { authorisePublicView } from '@/lib/public-view-auth';

export type IssueComment = {
  id: string;
  body: string;
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
};

export type IssueHistory = {
  id: string;
  createdAt: string;
  fromState?: {
    name: string;
    color: string;
  };
  toState?: {
    name: string;
    color: string;
  };
  fromAssignee?: {
    name: string;
  };
  toAssignee?: {
    name: string;
  };
  fromPriority?: number;
  toPriority?: number;
  user: {
    name: string;
    avatarUrl?: string;
  };
};

export type IssueDetail = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
  estimate?: number;
  url: string;
  state: {
    id: string;
    name: string;
    color: string;
    type: string;
  };
  assignee?: {
    id: string;
    name: string;
    avatarUrl?: string;
  };
  labels: Array<{
    id: string;
    name: string;
    color: string;
  }>;
  createdAt: string;
  updatedAt: string;
  comments: IssueComment[];
  history: IssueHistory[];
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string; issueId: string }> }
) {
  try {
    const { slug, issueId } = await params;

    if (!issueId) {
      return NextResponse.json(
        { error: 'issueId parameter is required' },
        { status: 400 }
      );
    }

    // Auth first: is_active + expiry + password cookie.
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;
    const viewData = auth.view;

    // Respect the view's issue restrictions. Without these checks, any
    // visitor who knows the slug + issueId could pull an excluded issue or
    // an issue outside the allowed statuses.
    if (viewData.excluded_issue_ids?.includes(issueId)) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', viewData.user_id)
      .single();

    if (profileError || !profileData?.linear_api_token) {
      return NextResponse.json(
        { error: 'Unable to load data - Linear API token not found' },
        { status: 500 }
      );
    }

    const decryptedToken = await decryptAndRotateTokenIfNeeded(
      profileData.linear_api_token,
      { userId: viewData.user_id, admin: supabaseAdmin },
    );

    // Gate comments and history via GraphQL @include. Keeps the query text
    // static (cacheable, readable) while view settings control the flags.
    const includeComments = viewData.show_comments ?? false;
    const includeActivity = viewData.show_activity ?? false;

    const query = `
      query IssueDetail($issueId: String!, $includeComments: Boolean!, $includeActivity: Boolean!) {
        issue(id: $issueId) {
          id
          identifier
          title
          description
          priority
          priorityLabel
          estimate
          url
          state {
            id
            name
            color
            type
          }
          assignee {
            id
            name
            avatarUrl
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
          comments @include(if: $includeComments) {
            nodes {
              id
              body
              createdAt
              updatedAt
              user {
                id
                name
                avatarUrl
              }
            }
          }
          history @include(if: $includeActivity) {
            nodes {
              id
              createdAt
              fromState {
                name
                color
              }
              toState {
                name
                color
              }
              fromAssignee {
                name
              }
              toAssignee {
                name
              }
              fromPriority
              toPriority
              actor {
                name
                avatarUrl
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
        Authorization: decryptedToken.trim(),
      },
      body: JSON.stringify({
        query,
        variables: { issueId, includeComments, includeActivity },
      }),
    });

    if (!response.ok) {
      throw new Error(
        `Linear API error: ${response.status} ${response.statusText}`
      );
    }

    const result = (await response.json()) as {
      data?: {
        issue: {
          id: string;
          identifier: string;
          title: string;
          description?: string;
          priority: number;
          priorityLabel: string;
          estimate?: number;
          url: string;
          state: {
            id: string;
            name: string;
            color: string;
            type: string;
          };
          assignee?: {
            id: string;
            name: string;
            avatarUrl?: string;
          };
          labels: {
            nodes: Array<{
              id: string;
              name: string;
              color: string;
            }>;
          };
          createdAt: string;
          updatedAt: string;
          comments?: {
            nodes: Array<{
              id: string;
              body: string;
              createdAt: string;
              updatedAt: string;
              user: {
                id: string;
                name: string;
                avatarUrl?: string;
              };
            }>;
          };
          history?: {
            nodes: Array<{
              id: string;
              createdAt: string;
              fromState?: {
                name: string;
                color: string;
              };
              toState?: {
                name: string;
                color: string;
              };
              fromAssignee?: {
                name: string;
              };
              toAssignee?: {
                name: string;
              };
              fromPriority?: number;
              toPriority?: number;
              actor: {
                name: string;
                avatarUrl?: string;
              };
            }>;
          };
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (result.errors) {
      throw new Error(
        `GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}`
      );
    }

    if (!result.data?.issue) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const issue = result.data.issue;

    // Enforce the view's allowed_statuses filter. Matches the list route's
    // behaviour: an issue outside the allowed set is not visible through
    // this view at all.
    if (
      viewData.allowed_statuses &&
      viewData.allowed_statuses.length > 0 &&
      !viewData.allowed_statuses.includes(issue.state.name)
    ) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

    const descriptionsVisible = viewData.show_descriptions !== false;

    const issueDetail: IssueDetail = {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: descriptionsVisible ? issue.description : undefined,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      estimate: issue.estimate,
      url: issue.url,
      state: issue.state,
      assignee: issue.assignee,
      labels: issue.labels.nodes,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      comments: issue.comments?.nodes ?? [],
      history: (issue.history?.nodes ?? []).map((h) => ({
        id: h.id,
        createdAt: h.createdAt,
        fromState: h.fromState,
        toState: h.toState,
        fromAssignee: h.fromAssignee,
        toAssignee: h.toAssignee,
        fromPriority: h.fromPriority,
        toPriority: h.toPriority,
        user: { name: h.actor.name, avatarUrl: h.actor.avatarUrl },
      })),
    };

    return NextResponse.json({
      success: true,
      issue: issueDetail,
    });
  } catch (error) {
    console.error('Issue detail API error:', error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 }
    );
  }
}
