const LINEAR_API_URL = 'https://api.linear.app/graphql';

export type LinearIssueTemplate = {
  id: string;
  name: string;
  description: string | null;
  descriptionContent: LinearEditorContent | null;
  icon: string | null;
  color: string | null;
  team: {
    id: string;
    name: string;
    key?: string | null;
  } | null;
};

type RawLinearTemplate = Omit<LinearIssueTemplate, 'descriptionContent'> & {
  type: string;
  templateData?: unknown;
};

type LinearTemplatesResponse = {
  errors?: Array<{ message: string }>;
  data?: {
    templates?: RawLinearTemplate[];
    project?: {
      teams?: {
        nodes: Array<{ id: string }>;
      };
    } | null;
    team?: {
      id: string;
    } | null;
  };
};

type FetchTemplatesOptions = {
  projectId?: string | null;
  teamId?: string | null;
};

function sortTemplates(templates: LinearIssueTemplate[]): LinearIssueTemplate[] {
  return [...templates].sort((a, b) => {
    const teamA = a.team?.name ?? '';
    const teamB = b.team?.name ?? '';
    const teamCompare = teamA.localeCompare(teamB, undefined, { sensitivity: 'base' });
    if (teamCompare !== 0) return teamCompare;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

type LinearRichTextNode = {
  type?: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type?: string; attrs?: Record<string, unknown> }>;
  content?: LinearRichTextNode[];
};

export type LinearEditorContent = {
  type: string;
  text?: string;
  attrs?: Record<string, unknown>;
  marks?: Array<{ type: string; attrs?: Record<string, unknown> }>;
  content?: LinearEditorContent[];
};

function parseTemplateData(value: unknown): Record<string, unknown> | null {
  if (!value) return null;

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value) as unknown;
      return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
        ? parsed as Record<string, unknown>
        : null;
    } catch {
      return null;
    }
  }

  return typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
}

function renderInline(nodes: LinearRichTextNode[] = []): string {
  return nodes.map((node) => {
    if (node.type === 'hard_break') return '\n';

    let text = node.text ?? '';
    if (!text && node.content) text = renderInline(node.content);

    for (const mark of node.marks ?? []) {
      if (mark.type === 'code') text = `\`${text}\``;
      if (mark.type === 'bold') text = `**${text}**`;
      if (mark.type === 'italic') text = `_${text}_`;
      if (mark.type === 'strike') text = `~~${text}~~`;
      if (mark.type === 'link') {
        const href = mark.attrs?.href;
        if (typeof href === 'string' && href) text = `[${text}](${href})`;
      }
    }

    return text;
  }).join('');
}

function indentMarkdown(markdown: string, spaces: number): string {
  const indent = ' '.repeat(spaces);
  return markdown
    .split('\n')
    .map((line) => (line ? `${indent}${line}` : line))
    .join('\n');
}

function renderListItem(
  node: LinearRichTextNode,
  prefix: string,
  depth: number,
): string {
  const content = node.content ?? [];
  const [firstBlock, ...restBlocks] = content;
  const indent = '  '.repeat(depth);
  const firstLine = firstBlock ? renderBlock(firstBlock, depth).trim() : '';
  const lines = [`${indent}${prefix}${firstLine}`];

  for (const block of restBlocks) {
    const rendered = renderBlock(block, depth + 1).trimEnd();
    if (rendered) lines.push(indentMarkdown(rendered, indent.length + prefix.length));
  }

  return lines.join('\n');
}

function renderBlock(node: LinearRichTextNode, depth = 0): string {
  switch (node.type) {
    case 'doc':
      return renderBlocks(node.content ?? [], depth);
    case 'heading': {
      const level =
        typeof node.attrs?.level === 'number'
          ? Math.min(Math.max(node.attrs.level, 1), 6)
          : 2;
      return `${'#'.repeat(level)} ${renderInline(node.content).trim()}`.trimEnd();
    }
    case 'paragraph':
      return renderInline(node.content).trimEnd();
    case 'bullet_list':
      return (node.content ?? [])
        .map((item) => renderListItem(item, '- ', depth))
        .join('\n');
    case 'ordered_list': {
      const start = typeof node.attrs?.order === 'number' ? node.attrs.order : 1;
      return (node.content ?? [])
        .map((item, index) => renderListItem(item, `${start + index}. `, depth))
        .join('\n');
    }
    case 'todo_list':
      return (node.content ?? [])
        .map((item) => {
          const checked = item.attrs?.done === true ? 'x' : ' ';
          return renderListItem(item, `- [${checked}] `, depth);
        })
        .join('\n');
    case 'blockquote':
      return renderBlocks(node.content ?? [], depth)
        .split('\n')
        .map((line) => `> ${line}`)
        .join('\n');
    case 'code_block':
      return `\`\`\`\n${renderInline(node.content)}\n\`\`\``;
    case 'list_item':
    case 'todo_item':
      return renderBlocks(node.content ?? [], depth);
    default:
      if (node.content) return renderBlocks(node.content, depth);
      return renderInline([node]).trimEnd();
  }
}

function renderBlocks(nodes: LinearRichTextNode[], depth = 0): string {
  return nodes
    .map((node) => renderBlock(node, depth))
    .filter((markdown) => markdown.trim().length > 0)
    .join('\n\n');
}

function templateDataDescriptionToMarkdown(templateData: unknown): string | null {
  const parsedTemplateData = parseTemplateData(templateData);
  const descriptionData = parsedTemplateData?.descriptionData;
  if (!descriptionData || typeof descriptionData !== 'object') return null;

  const markdown = renderBlock(descriptionData as LinearRichTextNode).trim();
  return markdown || null;
}

function mapInlineMarks(
  marks: LinearRichTextNode['marks'] = [],
): NonNullable<LinearEditorContent['marks']> {
  const mappedMarks: NonNullable<LinearEditorContent['marks']> = [];

  for (const mark of marks) {
    if (!mark.type) continue;

    if (mark.type === 'link') {
      const href = mark.attrs?.href;
      if (typeof href === 'string' && href) {
        mappedMarks.push({ type: 'link', attrs: { href } });
      }
      continue;
    }

    if (
      mark.type === 'bold' ||
      mark.type === 'italic' ||
      mark.type === 'strike' ||
      mark.type === 'code'
    ) {
      mappedMarks.push({ type: mark.type });
    }
  }

  return mappedMarks;
}

function mapInlineNodes(nodes: LinearRichTextNode[] = []): LinearEditorContent[] {
  return nodes.flatMap((node) => {
    if (node.type === 'hard_break') return [{ type: 'hardBreak' }];
    if (node.type === 'text' || node.text) {
      if (!node.text) return [];
      const marks = mapInlineMarks(node.marks);
      return [{
        type: 'text',
        text: node.text,
        ...(marks.length > 0 ? { marks } : {}),
      }];
    }

    return node.content ? mapInlineNodes(node.content) : [];
  });
}

function plainText(nodes: LinearRichTextNode[] = []): string {
  return nodes.map((node) => {
    if (node.type === 'hard_break') return '\n';
    if (node.text) return node.text;
    return node.content ? plainText(node.content) : '';
  }).join('');
}

function mapBlockNodes(nodes: LinearRichTextNode[] = []): LinearEditorContent[] {
  return nodes
    .map((node) => mapBlockNode(node))
    .filter((node): node is LinearEditorContent => Boolean(node));
}

function ensureListItemContent(nodes: LinearRichTextNode[] = []): LinearEditorContent[] {
  const content = mapBlockNodes(nodes);
  return content.length > 0 ? content : [{ type: 'paragraph' }];
}

function mapBlockNode(node: LinearRichTextNode): LinearEditorContent | null {
  switch (node.type) {
    case 'doc': {
      const content = mapBlockNodes(node.content ?? []);
      return {
        type: 'doc',
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
      };
    }
    case 'heading': {
      const level =
        typeof node.attrs?.level === 'number'
          ? Math.min(Math.max(node.attrs.level, 1), 6)
          : 2;
      return {
        type: 'heading',
        attrs: { level },
        content: mapInlineNodes(node.content),
      };
    }
    case 'paragraph':
      return {
        type: 'paragraph',
        content: mapInlineNodes(node.content),
      };
    case 'bullet_list':
      return {
        type: 'bulletList',
        content: mapBlockNodes(node.content ?? []),
      };
    case 'ordered_list': {
      const start = typeof node.attrs?.order === 'number' ? node.attrs.order : 1;
      return {
        type: 'orderedList',
        attrs: { start },
        content: mapBlockNodes(node.content ?? []),
      };
    }
    case 'todo_list':
      return {
        type: 'taskList',
        content: mapBlockNodes(node.content ?? []),
      };
    case 'list_item':
      return {
        type: 'listItem',
        content: ensureListItemContent(node.content),
      };
    case 'todo_item':
      return {
        type: 'taskItem',
        attrs: { checked: node.attrs?.done === true },
        content: ensureListItemContent(node.content),
      };
    case 'blockquote': {
      const content = mapBlockNodes(node.content ?? []);
      return {
        type: 'blockquote',
        content: content.length > 0 ? content : [{ type: 'paragraph' }],
      };
    }
    case 'code_block': {
      const text = plainText(node.content);
      return {
        type: 'codeBlock',
        content: text ? [{ type: 'text', text }] : [],
      };
    }
    default:
      if (node.content) {
        return {
          type: 'paragraph',
          content: mapInlineNodes(node.content),
        };
      }
      return null;
  }
}

function templateDataDescriptionToEditorContent(templateData: unknown): LinearEditorContent | null {
  const parsedTemplateData = parseTemplateData(templateData);
  const descriptionData = parsedTemplateData?.descriptionData;
  if (!descriptionData || typeof descriptionData !== 'object') return null;

  const content = mapBlockNode(descriptionData as LinearRichTextNode);
  return content?.type === 'doc' ? content : null;
}

async function fetchLinearTemplates(
  apiToken: string,
  query: string,
  variables: Record<string, unknown> = {},
): Promise<LinearTemplatesResponse> {
  const response = await fetch(LINEAR_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: apiToken.trim(),
    },
    body: JSON.stringify({ query, variables }),
  });

  if (!response.ok) {
    return { errors: [{ message: `Linear API error: ${response.status} ${response.statusText}` }] };
  }

  return response.json() as Promise<LinearTemplatesResponse>;
}

export async function fetchAvailableIssueTemplates(
  apiToken: string,
  options: FetchTemplatesOptions = {},
): Promise<{ success: true; templates: LinearIssueTemplate[] } | { success: false; error: string }> {
  const templateFields = `
    id
    name
    type
    description
    templateData
    icon
    color
    team {
      id
      name
      key
    }
  `;

  let result: LinearTemplatesResponse;
  let sourceTeamIds = new Set<string>();

  if (options.projectId) {
    result = await fetchLinearTemplates(
      apiToken,
      `
        query IssueTemplatesForProject($projectId: String!) {
          project(id: $projectId) {
            teams(first: 50) {
              nodes {
                id
              }
            }
          }
          templates {
            ${templateFields}
          }
        }
      `,
      { projectId: options.projectId },
    );
    sourceTeamIds = new Set(result.data?.project?.teams?.nodes.map((team) => team.id) ?? []);
  } else if (options.teamId) {
    result = await fetchLinearTemplates(
      apiToken,
      `
        query IssueTemplatesForTeam($teamId: String!) {
          team(id: $teamId) {
            id
          }
          templates {
            ${templateFields}
          }
        }
      `,
      { teamId: options.teamId },
    );
    if (result.data?.team?.id) sourceTeamIds = new Set([result.data.team.id]);
  } else {
    result = await fetchLinearTemplates(
      apiToken,
      `
        query IssueTemplates {
          templates {
            ${templateFields}
          }
        }
      `,
    );
  }

  if (result.errors) {
    return {
      success: false,
      error: result.errors.map((error) => error.message).join(', '),
    };
  }

  const issueTemplates = (result.data?.templates ?? [])
    .filter((template) => {
      if (template.type !== 'issue') return false;
      if (!template.team || sourceTeamIds.size === 0) return true;
      return sourceTeamIds.has(template.team.id);
    })
    .map((template) => ({
      ...template,
      description: templateDataDescriptionToMarkdown(template.templateData) || template.description,
      descriptionContent: templateDataDescriptionToEditorContent(template.templateData),
    }));

  return { success: true, templates: sortTemplates(issueTemplates) };
}
