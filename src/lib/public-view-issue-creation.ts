import type { PublicView } from '@/lib/supabase';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptAndRotateTokenIfNeeded } from '@/lib/encryption-rotation';
import { getActiveConnectionIdForOrg, getTokenForConnection } from '@/lib/linear-connection';

const LINEAR_API_URL = 'https://api.linear.app/graphql';

type PublicViewIssueCreationView = Pick<
  PublicView,
  | 'id'
  | 'user_id'
  | 'organisation_id'
  | 'linear_connection_id'
  | 'project_id'
  | 'team_id'
  | 'linear_project_id'
  | 'linear_team_id'
  | 'allowed_label_ids'
>;

interface WorkflowState {
  id: string;
  name: string;
  type: string;
  color: string;
}

interface LinearLabel {
  id: string;
  name: string;
  color: string;
}

interface LinearTeamMetadata {
  id: string;
  name: string;
  triageEnabled?: boolean;
  triageIssueState?: WorkflowState | null;
  states?: { nodes: WorkflowState[] };
  labels?: { nodes: LinearLabel[] };
}

type LinearMetadataResponse = {
  errors?: unknown[];
  data?: {
    team?: LinearTeamMetadata | null;
    project?: {
      teams?: {
        nodes: LinearTeamMetadata[];
      };
    } | null;
  };
};

type LinearIssueInput = {
  title: string;
  description?: string;
  stateId?: string;
  priority?: number;
  projectId?: string;
  teamId: string;
  labelIds?: string[];
  templateId?: string;
};

export type PublicViewIssueCreateInput = {
  title: string;
  description?: string;
  labelIds?: string[];
  templateId?: string;
};

export type LinearIssueCreationSource = {
  projectId?: string | null;
  teamId?: string | null;
  allowedLabelIds?: string[];
};

export type LinearCreatedIssue = {
  id: string;
  identifier: string;
  title: string;
  description?: string | null;
  priority: number;
  state?: {
    id: string;
    name: string;
    type: string;
    color: string;
  } | null;
  team?: {
    id: string;
    name: string;
    key: string;
  } | null;
  project?: {
    id: string;
    name: string;
  } | null;
  labels?: {
    nodes: Array<{
      id: string;
      name: string;
      color: string;
    }>;
  };
  createdAt: string;
  updatedAt: string;
};

export type PublicViewIssueCreateResult =
  | { ok: true; issue: LinearCreatedIssue }
  | { ok: false; status: number; error: string; details?: unknown };

function escapeMarkdownAltText(value: string): string {
  return value.replace(/[[\]\\]/g, '\\$&');
}

export function appendAttachmentMarkdown(
  description: string | undefined,
  attachments: Array<{ fileName: string; assetUrl: string }>,
): string | undefined {
  if (attachments.length === 0) return description;

  const attachmentMarkdown = attachments
    .map(({ fileName, assetUrl }) => `![${escapeMarkdownAltText(fileName)}](${assetUrl})`)
    .join('\n\n');

  return [description?.trim(), attachmentMarkdown].filter(Boolean).join('\n\n');
}

export async function resolveLinearTokenForPublicView(
  view: PublicViewIssueCreationView,
): Promise<string | null> {
  if (view.linear_connection_id) {
    return getTokenForConnection(view.linear_connection_id);
  }

  if (view.organisation_id) {
    const connectionId = await getActiveConnectionIdForOrg(supabaseAdmin, view.organisation_id);
    if (connectionId) {
      await supabaseAdmin
        .from('public_views')
        .update({ linear_connection_id: connectionId })
        .eq('id', view.id)
        .is('linear_connection_id', null);

      return getTokenForConnection(connectionId);
    }
  }

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

async function fetchSourceMetadata(
  apiToken: string,
  options: { teamId?: string | null; projectId?: string | null },
): Promise<LinearMetadataResponse> {
  if (options.teamId) {
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
          labels(first: 100) {
            nodes {
              id
              name
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
        'Authorization': apiToken.trim(),
      },
      body: JSON.stringify({ query, variables: { teamId: options.teamId } }),
    });

    return response.json() as Promise<LinearMetadataResponse>;
  }

  if (!options.projectId) {
    throw new Error('Either teamId or projectId is required');
  }

  const query = `
    query ProjectIssueCreationMetadata($projectId: String!) {
      project(id: $projectId) {
        id
        name
        teams(first: 50) {
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
            labels(first: 100) {
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

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken.trim(),
    },
    body: JSON.stringify({ query, variables: { projectId: options.projectId } }),
  });

  return response.json() as Promise<LinearMetadataResponse>;
}

function pickTeamForIssueCreation(
  teams: LinearTeamMetadata[],
  requiredLabelIds: string[],
): LinearTeamMetadata | undefined {
  if (teams.length === 0) return undefined;
  if (requiredLabelIds.length === 0) return teams[0];

  return teams.find((team) => {
    const teamLabelIds = new Set(team.labels?.nodes.map((label) => label.id) ?? []);
    return requiredLabelIds.every((labelId) => teamLabelIds.has(labelId));
  });
}

async function createLinearIssue(
  apiToken: string,
  input: LinearIssueInput,
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
      ...(input.templateId && { templateId: input.templateId }),
    },
  };

  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': apiToken.trim(),
    },
    body: JSON.stringify({ query: mutation, variables }),
  });

  return response.json() as Promise<{
    errors?: unknown[];
    data?: {
      issueCreate?: {
        success: boolean;
        issue: LinearCreatedIssue;
      };
    };
  }>;
}

export async function createIssueForLinearSource(
  apiToken: string,
  source: LinearIssueCreationSource,
  issue: PublicViewIssueCreateInput,
): Promise<PublicViewIssueCreateResult> {
  const sourceTeamId = source.teamId || null;
  const sourceProjectId = source.projectId || null;
  if (!sourceTeamId && !sourceProjectId) {
    return { ok: false, status: 400, error: 'No Linear project or team is configured' };
  }

  const finalLabelIds = Array.from(
    new Set([...(source.allowedLabelIds ?? []), ...(issue.labelIds ?? [])]),
  );

  const metadata = await fetchSourceMetadata(apiToken, {
    teamId: sourceTeamId,
    projectId: sourceProjectId,
  });

  if (metadata.errors) {
    console.error('Linear API errors:', metadata.errors);
    return {
      ok: false,
      status: 400,
      error: 'Failed to fetch view metadata',
      details: metadata.errors,
    };
  }

  const projectTeams = metadata.data?.project?.teams?.nodes ?? [];
  const teamMetadata = sourceTeamId
    ? metadata.data?.team ?? undefined
    : pickTeamForIssueCreation(projectTeams, finalLabelIds);

  if (!teamMetadata?.id) {
    if (!sourceTeamId && projectTeams.length > 0 && finalLabelIds.length > 0) {
      return { ok: false, status: 400, error: 'One or more labels are not available for this source' };
    }

    return { ok: false, status: 400, error: 'No Linear team is available for this view source' };
  }

  const allowedLabelIds = new Set(
    teamMetadata.labels?.nodes.map((label) => label.id) ?? [],
  );
  const invalidLabelIds = finalLabelIds.filter((labelId) => !allowedLabelIds.has(labelId));
  if (invalidLabelIds.length > 0) {
    return { ok: false, status: 400, error: 'One or more labels are not available for this source' };
  }

  let finalStateId: string | undefined = undefined;
  if (teamMetadata.triageEnabled && teamMetadata.triageIssueState) {
    finalStateId = teamMetadata.triageIssueState.id;
  } else if (teamMetadata.states?.nodes) {
    const unstartedState = teamMetadata.states.nodes.find(
      (state) => state.type === 'unstarted',
    );
    finalStateId = unstartedState?.id ?? teamMetadata.states.nodes.at(0)?.id;
  }

  const result = await createLinearIssue(apiToken, {
    title: issue.title,
    ...(issue.description ? { description: issue.description } : {}),
    ...(finalStateId ? { stateId: finalStateId } : {}),
    priority: 0,
    ...(sourceProjectId ? { projectId: sourceProjectId } : {}),
    teamId: teamMetadata.id,
    labelIds: finalLabelIds,
    ...(issue.templateId ? { templateId: issue.templateId } : {}),
  });

  if (result.errors) {
    console.error('Linear API errors:', result.errors);
    return {
      ok: false,
      status: 400,
      error: 'Failed to create issue',
      details: result.errors,
    };
  }

  if (!result.data?.issueCreate?.success) {
    return { ok: false, status: 400, error: 'Failed to create issue' };
  }

  return { ok: true, issue: result.data.issueCreate.issue };
}

export async function createIssueForPublicView(
  apiToken: string,
  view: PublicViewIssueCreationView,
  issue: PublicViewIssueCreateInput,
): Promise<PublicViewIssueCreateResult> {
  return createIssueForLinearSource(
    apiToken,
    {
      teamId: view.linear_team_id || view.team_id,
      projectId: view.linear_project_id || view.project_id,
      allowedLabelIds: view.allowed_label_ids ?? [],
    },
    issue,
  );
}
