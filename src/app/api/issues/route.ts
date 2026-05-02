import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { issues, issueStatuses, issueLabels, labels, projects, users } from '@/db/schema';
import { eq, and, inArray } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');
  const projectId = searchParams.get('projectId');
  const statusId = searchParams.get('statusId');
  const priority = searchParams.get('priority');

  const filters = [];
  if (teamId) filters.push(eq(issues.teamId, teamId));
  if (projectId) filters.push(eq(issues.projectId, projectId));
  if (statusId) filters.push(eq(issues.statusId, statusId));
  if (priority) filters.push(eq(issues.priority, priority as 'no_priority' | 'urgent' | 'high' | 'medium' | 'low'));

  const rows = await db
    .select({
      id: issues.id,
      title: issues.title,
      description: issues.description,
      priority: issues.priority,
      estimate: issues.estimate,
      dueDate: issues.dueDate,
      sortOrder: issues.sortOrder,
      createdAt: issues.createdAt,
      updatedAt: issues.updatedAt,
      teamId: issues.teamId,
      projectId: issues.projectId,
      assigneeId: issues.assigneeId,
      assigneeName: users.name,
      assigneeAvatarUrl: users.avatarUrl,
      statusId: issues.statusId,
      statusName: issueStatuses.name,
      statusColor: issueStatuses.color,
      statusType: issueStatuses.type,
      projectName: projects.name,
      projectColor: projects.color,
    })
    .from(issues)
    .leftJoin(issueStatuses, eq(issues.statusId, issueStatuses.id))
    .leftJoin(projects, eq(issues.projectId, projects.id))
    .leftJoin(users, eq(issues.assigneeId, users.id))
    .where(filters.length > 0 ? and(...filters) : undefined)
    .orderBy(issueStatuses.position, issues.sortOrder);

  // Attach labels to each issue
  const issueIds = rows.map(r => r.id);
  const labelRows = issueIds.length > 0
    ? await db
        .select({ issueId: issueLabels.issueId, labelId: labels.id, labelName: labels.name, labelColor: labels.color })
        .from(issueLabels)
        .leftJoin(labels, eq(issueLabels.labelId, labels.id))
        .where(inArray(issueLabels.issueId, issueIds))
    : [];

  const labelsByIssue = labelRows.reduce<Record<string, { id: string; name: string; color: string }[]>>(
    (acc, row) => {
      if (!row.labelId || !row.labelName || !row.labelColor) return acc;
      if (!acc[row.issueId]) acc[row.issueId] = [];
      acc[row.issueId].push({ id: row.labelId, name: row.labelName, color: row.labelColor });
      return acc;
    },
    {}
  );

  const data = rows.map(r => ({ ...r, labels: labelsByIssue[r.id] ?? [] }));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    teamId: string;
    statusId: string;
    title: string;
    description?: string;
    priority?: 'no_priority' | 'urgent' | 'high' | 'medium' | 'low';
    projectId?: string;
    estimate?: number;
    dueDate?: string;
    labelIds?: string[];
  };
  if (!body.teamId || !body.statusId || !body.title) {
    return NextResponse.json({ error: 'teamId, statusId, and title are required' }, { status: 400 });
  }
  const [row] = await db.insert(issues).values({
    teamId: body.teamId,
    statusId: body.statusId,
    title: body.title,
    description: body.description,
    priority: body.priority ?? 'no_priority',
    projectId: body.projectId,
    estimate: body.estimate,
    dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
  }).returning();

  if (body.labelIds && body.labelIds.length > 0) {
    await db.insert(issueLabels).values(body.labelIds.map(labelId => ({ issueId: row.id, labelId })));
  }

  return NextResponse.json({ data: row }, { status: 201 });
}
