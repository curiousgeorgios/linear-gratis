import { NextRequest, NextResponse } from 'next/server';
import { authorisePublicView } from '@/lib/public-view-auth';
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation';
import { getActiveConnectionIdForOrg, getTokenForConnection } from '@/lib/linear-connection';
import { supabaseAdmin } from '@/lib/supabase';
import type { PublicView } from '@/lib/supabase';

const LINEAR_API_URL = 'https://api.linear.app/graphql';
const ISSUE_IDENTIFIER_PATTERN = /\b[A-Z][A-Z0-9]*-\d+\b/g;
const MAX_REFERENCED_ISSUES = 100;

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
  referencedIssues: Record<string, ReferencedIssue>;
};

export type ReferencedIssue = {
  id: string;
  identifier: string;
  title: string;
  url: string;
  state: {
    id: string;
    name: string;
    color: string;
    type: string;
  };
};

function extractReferencedIssueIdentifiers(
  markdown: string | undefined,
  currentIdentifier: string,
): string[] {
  if (!markdown) return [];

  const identifiers = new Set<string>();
  for (const match of markdown.matchAll(ISSUE_IDENTIFIER_PATTERN)) {
    const identifier = match[0].toUpperCase();
    if (identifier === currentIdentifier.toUpperCase()) continue;
    identifiers.add(identifier);
    if (identifiers.size >= MAX_REFERENCED_ISSUES) break;
  }

  return Array.from(identifiers);
}

async function resolveLinearTokenForView(view: PublicView): Promise<string | null> {
  if (view.linear_connection_id) {
    return getTokenForConnection(view.linear_connection_id);
  }

  const connectionId = view.organisation_id
    ? await getActiveConnectionIdForOrg(supabaseAdmin, view.organisation_id)
    : null;
  if (connectionId) {
    await supabaseAdmin
      .from('public_views')
      .update({ linear_connection_id: connectionId })
      .eq('id', view.id)
      .is('linear_connection_id', null);

    return getTokenForConnection(connectionId);
  }

  // Legacy fallback while older deployments still store the token on profiles
  // and have not applied the organisation_linear_connections migration.
  const { data: profile } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', view.user_id)
    .single();

  if (!profile?.linear_api_token) return null;

  try {
    return await decryptAndRotateTokenIfNeeded(profile.linear_api_token, {
      userId: view.user_id,
      admin: supabaseAdmin,
    });
  } catch {
    return null;
  }
}

async function fetchReferencedIssues(
  apiToken: string,
  identifiers: string[],
  view: PublicView,
): Promise<Record<string, ReferencedIssue>> {
  if (identifiers.length === 0) return {};

  const query = `
    query ReferencedIssues($issueIds: [ID!], $first: Int!) {
      issues(first: $first, filter: { id: { in: $issueIds } }) {
        nodes {
          id
          identifier
          title
          url
          team {
            id
          }
          project {
            id
          }
          state {
            id
            name
            color
            type
          }
        }
      }
    }
  `;

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken.trim(),
    },
    body: JSON.stringify({
      query,
      variables: {
        issueIds: identifiers,
        first: identifiers.length,
      },
    }),
  });

  if (!response.ok) return {};

  const result = (await response.json()) as {
    data?: {
      issues?: {
        nodes: Array<{
          id: string;
          identifier: string;
          title: string;
          url: string;
          team?: { id: string } | null;
          project?: { id: string } | null;
          state: {
            id: string;
            name: string;
            color: string;
            type: string;
          };
        }>;
      };
    };
    errors?: Array<{ message: string }>;
  };

  if (result.errors || !result.data?.issues?.nodes) return {};

  const references: Record<string, ReferencedIssue> = {};
  for (const referencedIssue of result.data.issues.nodes) {
    const issueBelongsToView = view.project_id
      ? referencedIssue.project?.id === view.project_id
      : view.team_id
        ? referencedIssue.team?.id === view.team_id
        : false;

    if (!issueBelongsToView) continue;
    if (view.excluded_issue_ids?.includes(referencedIssue.id)) continue;
    if (view.excluded_issue_ids?.includes(referencedIssue.identifier)) continue;
    if (
      view.allowed_statuses &&
      view.allowed_statuses.length > 0 &&
      !view.allowed_statuses.includes(referencedIssue.state.name)
    ) {
      continue;
    }

    references[referencedIssue.identifier.toUpperCase()] = {
      id: referencedIssue.id,
      identifier: referencedIssue.identifier,
      title: referencedIssue.title,
      url: referencedIssue.url,
      state: referencedIssue.state,
    };
  }

  return references;
}

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

    const decryptedToken = await resolveLinearTokenForView(viewData);
    if (!decryptedToken) {
      return NextResponse.json(
        { error: 'Unable to load data - Linear API token not found' },
        { status: 500 }
      );
    }

    // Gate comments and history via GraphQL @include. Keeps the query text
    // static (cacheable, readable) while view settings control the flags.
    const includeComments = (viewData.show_comments ?? false) || (viewData.show_activity ?? false);
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
          team {
            id
          }
          project {
            id
          }
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

    const response = await fetch(LINEAR_API_URL, {
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
          team?: {
            id: string;
          } | null;
          project?: {
            id: string;
          } | null;
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
    const issueBelongsToView = viewData.project_id
      ? issue.project?.id === viewData.project_id
      : viewData.team_id
        ? issue.team?.id === viewData.team_id
        : false;

    if (!issueBelongsToView || viewData.excluded_issue_ids?.includes(issue.id)) {
      return NextResponse.json(
        { error: 'Issue not found' },
        { status: 404 }
      );
    }

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
    const prioritiesVisible = viewData.show_priorities !== false;
    const assigneesVisible = viewData.show_assignees !== false;
    const labelsVisible = viewData.show_labels !== false;
    const comments = issue.comments?.nodes ?? [];

    const referenceSourceMarkdown = [
      descriptionsVisible ? issue.description : undefined,
      ...comments.map((comment) => comment.body),
    ]
      .filter((markdown): markdown is string => Boolean(markdown))
      .join('\n\n');

    const referencedIssues = referenceSourceMarkdown
      ? await fetchReferencedIssues(
          decryptedToken,
          extractReferencedIssueIdentifiers(referenceSourceMarkdown, issue.identifier),
          viewData,
        )
      : {};

    const issueDetail: IssueDetail = {
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: descriptionsVisible ? issue.description : undefined,
      priority: prioritiesVisible ? issue.priority : 0,
      priorityLabel: prioritiesVisible ? issue.priorityLabel : 'No priority',
      estimate: prioritiesVisible ? issue.estimate : undefined,
      url: issue.url,
      state: issue.state,
      assignee: assigneesVisible ? issue.assignee : undefined,
      labels: labelsVisible ? issue.labels.nodes : [],
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
      comments,
      history: (issue.history?.nodes ?? []).map((h) => ({
        id: h.id,
        createdAt: h.createdAt,
        fromState: h.fromState,
        toState: h.toState,
        fromAssignee: assigneesVisible ? h.fromAssignee : undefined,
        toAssignee: assigneesVisible ? h.toAssignee : undefined,
        fromPriority: prioritiesVisible ? h.fromPriority : undefined,
        toPriority: prioritiesVisible ? h.toPriority : undefined,
        user: { name: h.actor.name, avatarUrl: h.actor.avatarUrl },
      })),
      referencedIssues,
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
