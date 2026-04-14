import { NextRequest, NextResponse } from "next/server";
import { paginateLinearConnection, type LinearConnection } from "@/lib/linear";

export type LinearIssue = {
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
};

export type LinearTeam = {
  id: string;
  name: string;
  key: string;
};

export type RequestBody = {
  apiToken: string;
  projectId?: string;
  teamId?: string;
  statuses?: string[];
};

type IssueNode = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
  estimate?: number;
  url: string;
  state: { id: string; name: string; color: string; type: string };
  assignee?: { id: string; name: string; avatarUrl?: string };
  labels: { nodes: Array<{ id: string; name: string; color: string }> };
  createdAt: string;
  updatedAt: string;
};

export async function POST(request: NextRequest) {
  try {
    const { apiToken, projectId, teamId, statuses } =
      (await request.json()) as RequestBody;

    if (!apiToken) {
      return NextResponse.json(
        { error: "Missing required field: apiToken" },
        { status: 400 },
      );
    }

    if (!projectId && !teamId) {
      return NextResponse.json(
        { error: "Either projectId or teamId must be provided" },
        { status: 400 },
      );
    }

    let filterCondition = "";
    if (projectId) {
      filterCondition = `project: { id: { eq: "${projectId}" } }`;
    } else if (teamId) {
      filterCondition = `team: { id: { eq: "${teamId}" } }`;
    }

    if (statuses && statuses.length > 0) {
      const statusFilter = `state: { name: { in: [${statuses.map((s) => `"${s}"`).join(", ")}] } }`;
      filterCondition = filterCondition
        ? `${filterCondition}, ${statusFilter}`
        : statusFilter;
    }

    const query = `
      query Issues($after: String) {
        issues(
          filter: { ${filterCondition} }
          orderBy: updatedAt
          first: 250
          after: $after
        ) {
          nodes {
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
          }
          pageInfo {
            hasNextPage
            endCursor
          }
        }
      }
    `;

    const result = await paginateLinearConnection<IssueNode>({
      apiToken,
      query,
      extract: (data) =>
        (data as { issues: LinearConnection<IssueNode> }).issues,
    });

    if (!result.success) {
      throw new Error(result.error);
    }

    const issues: LinearIssue[] = result.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
      estimate: issue.estimate,
      url: issue.url,
      state: issue.state,
      assignee: issue.assignee,
      labels: issue.labels.nodes,
      createdAt: issue.createdAt,
      updatedAt: issue.updatedAt,
    }));

    return NextResponse.json({
      success: true,
      issues,
    });
  } catch (error) {
    console.error("Issues API error:", error);
    return NextResponse.json(
      {
        success: false,
        error:
          error instanceof Error ? error.message : "Unknown error occurred",
      },
      { status: 500 },
    );
  }
}
