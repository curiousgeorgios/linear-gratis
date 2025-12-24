import { NextRequest, NextResponse } from "next/server";

export type LinearIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string;
  priority: number;
  priorityLabel: string;
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

    // Build the filter conditions
    let filterCondition = "";
    if (projectId) {
      filterCondition = `project: { id: { eq: "${projectId}" } }`;
    } else if (teamId) {
      filterCondition = `team: { id: { eq: "${teamId}" } }`;
    }

    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      const statusFilter = `state: { name: { in: [${statuses.map((s) => `"${s}"`).join(", ")}] } }`;
      filterCondition = filterCondition
        ? `${filterCondition}, ${statusFilter}`
        : statusFilter;
    }

    // Get issues from Linear using GraphQL - simplified to reduce complexity
    const query = `
      query Issues {
        issues(
          filter: { ${filterCondition} }
          orderBy: updatedAt
          first: 50
        ) {
          nodes {
            id
            identifier
            title
            description
            priority
            priorityLabel
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

    const response = await fetch("https://api.linear.app/graphql", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `${apiToken.replace(/[^\x00-\xFF]/g, "")}`,
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      throw new Error(
        `Linear API error: ${response.status} ${response.statusText}`,
      );
    }

    const result = (await response.json()) as {
      data?: {
        issues: {
          nodes: Array<{
            id: string;
            identifier: string;
            title: string;
            description?: string;
            priority: number;
            priorityLabel: string;
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
          }>;
        };
      };
      errors?: Array<{ message: string }>;
    };

    if (result.errors) {
      throw new Error(
        `GraphQL errors: ${result.errors.map((e) => e.message).join(", ")}`,
      );
    }

    if (!result.data) {
      throw new Error("No data returned from Linear API");
    }

    // Transform the data to match our LinearIssue type
    const issues: LinearIssue[] = result.data.issues.nodes.map((issue) => ({
      id: issue.id,
      identifier: issue.identifier,
      title: issue.title,
      description: issue.description,
      priority: issue.priority,
      priorityLabel: issue.priorityLabel,
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
