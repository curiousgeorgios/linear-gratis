/**
 * Linear issue type returned from the API
 */
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

/**
 * Fetches issues from Linear API directly (server-side only)
 *
 * @param apiToken - Linear API token
 * @param options - Filter options (projectId or teamId required)
 * @returns Promise with issues array or error
 */
export async function fetchLinearIssues(
  apiToken: string,
  options: {
    projectId?: string;
    teamId?: string;
    statuses?: string[];
  }
): Promise<{ success: true; issues: LinearIssue[] } | { success: false; error: string }> {
  try {
    const { projectId, teamId, statuses } = options;

    if (!projectId && !teamId) {
      return { success: false, error: 'Either projectId or teamId must be provided' };
    }

    // Build the filter conditions
    let filterCondition = '';
    if (projectId) {
      filterCondition = `project: { id: { eq: "${projectId}" } }`;
    } else if (teamId) {
      filterCondition = `team: { id: { eq: "${teamId}" } }`;
    }

    // Add status filter if provided
    if (statuses && statuses.length > 0) {
      const statusFilter = `state: { name: { in: [${statuses.map((s) => `"${s}"`).join(', ')}] } }`;
      filterCondition = filterCondition
        ? `${filterCondition}, ${statusFilter}`
        : statusFilter;
    }

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

    const response = await fetch('https://api.linear.app/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: apiToken.trim(),
      },
      body: JSON.stringify({ query }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      return { success: false, error: `Linear API error: ${response.status} ${response.statusText} - ${errorText}` };
    }

    const result = await response.json() as {
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
      return { success: false, error: `GraphQL errors: ${result.errors.map((e) => e.message).join(', ')}` };
    }

    if (!result.data) {
      return { success: false, error: 'No data returned from Linear API' };
    }

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

    return { success: true, issues };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}

/**
 * Linear Customer Request Manager
 *
 * A simple wrapper around the Linear API that creates customer requests
 * using the official Linear SDK on the server-side.
 */
export class LinearCustomerRequestManager {
  private apiToken: string;

  constructor(apiToken: string) {
    this.apiToken = apiToken;
  }

  /**
   * Creates a customer request in Linear
   *
   * @param customerData - Customer information (name, email, etc.)
   * @param requestData - Request details (title, body, attachments)
   * @param projectId - Linear project ID to create the request in
   * @returns Promise with success status and request/customer data
   */
  async createRequestWithCustomer(
    customerData: {
      name: string;
      email: string;
      externalId?: string;
      avatarUrl?: string;
    },
    requestData: {
      title: string;
      body: string;
      attachmentUrl?: string;
      attachmentId?: string;
      commentId?: string;
    },
    projectId: string
  ) {
    try {
      const response = await fetch('/api/linear', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          apiToken: this.apiToken,
          customerData,
          requestData,
          projectId
        })
      });

      if (!response.ok) {
        const errorData = await response.json() as { error?: string };
        throw new Error(errorData.error || `HTTP Error: ${response.status}`);
      }

      const data = await response.json() as {
        success: boolean
        customer?: { id: string }
        request?: { id: string }
        error?: string
      };
      return data;

    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }
}