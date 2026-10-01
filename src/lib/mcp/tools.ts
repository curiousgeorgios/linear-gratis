import { McpToolError, type McpTool } from './protocol'
import { linearGraphQL } from './linear-gql'
import { fetchLinearIssues } from '@/lib/linear'

export type McpContext = {
  organisationId: string
  /** Public origin of this deployment, used to build shareable links. */
  baseUrl: string
  /** Resolves (and decrypts) the organisation's Linear token on demand. */
  getLinearToken: () => Promise<string>
  /** Reads rows of one of the organisation's own tables, newest first. */
  listOrgRows: (table: string, columns: string) => Promise<Array<Record<string, unknown>>>
}

const MAX_ISSUES = 100

function str(args: Record<string, unknown>, key: string): string | undefined {
  const value = args[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function int(args: Record<string, unknown>, key: string): number | undefined {
  const value = args[key]
  return typeof value === 'number' && Number.isInteger(value) ? value : undefined
}

function strList(args: Record<string, unknown>, key: string): string[] | undefined {
  const value = args[key]
  if (!Array.isArray(value)) return undefined
  const list = value.filter((item): item is string => typeof item === 'string' && item.length > 0)
  return list.length ? list : undefined
}

const ISSUE_FIELDS = `
  id identifier title description priority priorityLabel url createdAt updatedAt
  state { id name type }
  assignee { id name }
  team { id key name }
  project { id name }
  labels { nodes { id name } }
`

type IssueNode = {
  id: string
  identifier: string
  title: string
  description?: string | null
  priority: number
  priorityLabel: string
  url: string
  state: { id: string; name: string; type: string }
  assignee?: { id: string; name: string } | null
  team?: { id: string; key: string; name: string }
  project?: { id: string; name: string } | null
  labels: { nodes: Array<{ id: string; name: string }> }
  createdAt: string
  updatedAt: string
}

function shapeIssue(issue: IssueNode) {
  const { labels, ...rest } = issue
  return { ...rest, labels: labels.nodes.map((label) => label.name) }
}

export const mcpTools: McpTool<McpContext>[] = [
  {
    name: 'linear_list_teams',
    title: 'List Linear teams',
    description: 'List the teams in the connected Linear workspace. Use the returned id as teamId elsewhere.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (_args, ctx) => {
      const data = await linearGraphQL<{ teams: { nodes: unknown[] } }>(
        await ctx.getLinearToken(),
        'query { teams(first: 250) { nodes { id key name description } } }',
      )
      return data.teams.nodes
    },
  },
  {
    name: 'linear_list_projects',
    title: 'List Linear projects',
    description: 'List projects in the connected Linear workspace.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (_args, ctx) => {
      const data = await linearGraphQL<{ projects: { nodes: unknown[] } }>(
        await ctx.getLinearToken(),
        'query { projects(first: 250) { nodes { id name description state url } } }',
      )
      return data.projects.nodes
    },
  },
  {
    name: 'linear_list_issues',
    title: 'List Linear issues',
    description: `List issues for a team or project, newest-updated first (max ${MAX_ISSUES}). Provide teamId or projectId.`,
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string', description: 'Linear team id.' },
        projectId: { type: 'string', description: 'Linear project id.' },
        statuses: { type: 'array', items: { type: 'string' }, description: 'Only these workflow state names.' },
        limit: { type: 'integer', minimum: 1, maximum: MAX_ISSUES, description: 'Default 25.' },
      },
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (args, ctx) => {
      const teamId = str(args, 'teamId')
      const projectId = str(args, 'projectId')
      if (!teamId && !projectId) throw new McpToolError('Provide teamId or projectId.')
      const limit = Math.min(Math.max(int(args, 'limit') ?? 25, 1), MAX_ISSUES)
      const result = await fetchLinearIssues(await ctx.getLinearToken(), {
        teamId,
        projectId,
        statuses: strList(args, 'statuses'),
      })
      if (!result.success) throw new McpToolError(result.error)
      return result.issues.slice(0, limit).map((issue) => ({
        id: issue.id,
        identifier: issue.identifier,
        title: issue.title,
        state: issue.state.name,
        priority: issue.priorityLabel,
        assignee: issue.assignee?.name ?? null,
        labels: issue.labels.map((label) => label.name),
        url: issue.url,
        updatedAt: issue.updatedAt,
      }))
    },
  },
  {
    name: 'linear_get_issue',
    title: 'Get a Linear issue',
    description: 'Fetch one issue by id or identifier (for example ENG-123), including its description and recent comments.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: 'string', description: 'Issue UUID or identifier such as ENG-123.' } },
      required: ['id'],
    },
    annotations: { readOnlyHint: true, openWorldHint: true },
    handler: async (args, ctx) => {
      const data = await linearGraphQL<{
        issue: (IssueNode & { comments: { nodes: Array<{ body: string; createdAt: string; user?: { name: string } | null }> } }) | null
      }>(
        await ctx.getLinearToken(),
        `query($id: String!) { issue(id: $id) { ${ISSUE_FIELDS} comments(first: 20) { nodes { body createdAt user { name } } } } }`,
        { id: str(args, 'id') },
      )
      if (!data.issue) throw new McpToolError('Issue not found.')
      const { comments, ...issue } = data.issue
      return { ...shapeIssue(issue), comments: comments.nodes }
    },
  },
  {
    name: 'linear_create_issue',
    title: 'Create a Linear issue',
    description: 'Create an issue in a team. Priority: 0 none, 1 urgent, 2 high, 3 medium, 4 low.',
    inputSchema: {
      type: 'object',
      properties: {
        teamId: { type: 'string' },
        title: { type: 'string' },
        description: { type: 'string', description: 'Markdown.' },
        priority: { type: 'integer', minimum: 0, maximum: 4 },
        projectId: { type: 'string' },
        stateId: { type: 'string' },
        labelIds: { type: 'array', items: { type: 'string' } },
      },
      required: ['teamId', 'title'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (args, ctx) => {
      const input = {
        teamId: str(args, 'teamId'),
        title: str(args, 'title'),
        description: str(args, 'description'),
        priority: int(args, 'priority'),
        projectId: str(args, 'projectId'),
        stateId: str(args, 'stateId'),
        labelIds: strList(args, 'labelIds'),
      }
      const data = await linearGraphQL<{ issueCreate: { success: boolean; issue: IssueNode | null } }>(
        await ctx.getLinearToken(),
        `mutation($input: IssueCreateInput!) { issueCreate(input: $input) { success issue { ${ISSUE_FIELDS} } } }`,
        { input },
      )
      if (!data.issueCreate.success || !data.issueCreate.issue) throw new McpToolError('Linear did not create the issue.')
      return shapeIssue(data.issueCreate.issue)
    },
  },
  {
    name: 'linear_update_issue',
    title: 'Update a Linear issue',
    description: 'Change an issue\'s title, description, state, priority or assignee. Only provided fields change.',
    inputSchema: {
      type: 'object',
      properties: {
        id: { type: 'string', description: 'Issue UUID or identifier.' },
        title: { type: 'string' },
        description: { type: 'string' },
        stateId: { type: 'string' },
        priority: { type: 'integer', minimum: 0, maximum: 4 },
        assigneeId: { type: 'string' },
      },
      required: ['id'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, idempotentHint: true, openWorldHint: true },
    handler: async (args, ctx) => {
      const input = {
        title: str(args, 'title'),
        description: str(args, 'description'),
        stateId: str(args, 'stateId'),
        priority: int(args, 'priority'),
        assigneeId: str(args, 'assigneeId'),
      }
      if (Object.values(input).every((value) => value === undefined)) {
        throw new McpToolError('Nothing to update: pass at least one field besides id.')
      }
      const data = await linearGraphQL<{ issueUpdate: { success: boolean; issue: IssueNode | null } }>(
        await ctx.getLinearToken(),
        `mutation($id: String!, $input: IssueUpdateInput!) { issueUpdate(id: $id, input: $input) { success issue { ${ISSUE_FIELDS} } } }`,
        { id: str(args, 'id'), input },
      )
      if (!data.issueUpdate.success || !data.issueUpdate.issue) throw new McpToolError('Linear did not update the issue.')
      return shapeIssue(data.issueUpdate.issue)
    },
  },
  {
    name: 'linear_add_comment',
    title: 'Comment on a Linear issue',
    description: 'Add a Markdown comment to an issue.',
    inputSchema: {
      type: 'object',
      properties: { issueId: { type: 'string', description: 'Issue UUID.' }, body: { type: 'string' } },
      required: ['issueId', 'body'],
    },
    annotations: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
    handler: async (args, ctx) => {
      const data = await linearGraphQL<{ commentCreate: { success: boolean; comment: { id: string; url: string } | null } }>(
        await ctx.getLinearToken(),
        'mutation($input: CommentCreateInput!) { commentCreate(input: $input) { success comment { id url } } }',
        { input: { issueId: str(args, 'issueId'), body: str(args, 'body') } },
      )
      if (!data.commentCreate.success || !data.commentCreate.comment) throw new McpToolError('Linear did not create the comment.')
      return data.commentCreate.comment
    },
  },
  {
    name: 'list_request_forms',
    title: 'List customer request forms',
    description: 'List the customer request forms of this organisation with their public URLs.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    handler: async (_args, ctx) => {
      const rows = await ctx.listOrgRows('customer_request_forms', 'name, slug, form_title, linear_project_name, is_active, created_at')
      return rows.map((row) => ({ ...row, url: `${ctx.baseUrl}/form/${String(row.slug)}` }))
    },
  },
  {
    name: 'list_public_views',
    title: 'List public views',
    description: 'List the shared public issue views (kanban/list boards) with their public URLs.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    handler: async (_args, ctx) => {
      const rows = await ctx.listOrgRows('public_views', 'name, slug, view_title, linear_team_name, linear_project_name, is_active, password_protected, expires_at, created_at')
      return rows.map((row) => ({ ...row, url: `${ctx.baseUrl}/view/${String(row.slug)}` }))
    },
  },
  {
    name: 'list_roadmaps',
    title: 'List public roadmaps',
    description: 'List the public roadmaps with their public URLs.',
    inputSchema: { type: 'object', properties: {} },
    annotations: { readOnlyHint: true },
    handler: async (_args, ctx) => {
      const rows = await ctx.listOrgRows('roadmaps', 'name, slug, title, is_active, created_at')
      return rows.map((row) => ({ ...row, url: `${ctx.baseUrl}/roadmap/${String(row.slug)}` }))
    },
  },
]
