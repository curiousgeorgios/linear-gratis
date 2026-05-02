import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { issues, issueStatuses, issueLabels, labels, projects, comments, issueHistory, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const [issue] = await db
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
    .where(eq(issues.id, id));

  if (!issue) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const [issueLabelsRows, issueComments, history] = await Promise.all([
    db.select({ id: labels.id, name: labels.name, color: labels.color })
      .from(issueLabels)
      .leftJoin(labels, eq(issueLabels.labelId, labels.id))
      .where(eq(issueLabels.issueId, id)),
    db.select().from(comments).where(eq(comments.issueId, id)).orderBy(comments.createdAt),
    db.select().from(issueHistory).where(eq(issueHistory.issueId, id)).orderBy(issueHistory.createdAt),
  ]);

  return NextResponse.json({
    data: {
      ...issue,
      labels: issueLabelsRows.filter(l => l.id),
      comments: issueComments,
      history,
    },
  });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{
    title: string;
    description: string;
    priority: 'no_priority' | 'urgent' | 'high' | 'medium' | 'low';
    statusId: string;
    projectId: string | null;
    assigneeId: string | null;
    estimate: number | null;
    dueDate: string | null;
    labelIds: string[];
  }>;

  const [current] = await db.select().from(issues).where(eq(issues.id, id));
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { labelIds, dueDate, ...fields } = body;

  const [updated] = await db.update(issues).set({
    ...fields,
    ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
    updatedAt: new Date(),
  }).where(eq(issues.id, id)).returning();

  // Record history for key field changes
  const tracked = ['title', 'statusId', 'priority', 'projectId', 'estimate'] as const;
  const historyEntries = tracked
    .filter(f => fields[f] !== undefined && String(fields[f]) !== String(current[f]))
    .map(f => ({ issueId: id, field: f, oldValue: String(current[f] ?? ''), newValue: String(fields[f] ?? '') }));
  if (historyEntries.length > 0) {
    await db.insert(issueHistory).values(historyEntries);
  }

  // Update labels if provided
  if (labelIds !== undefined) {
    await db.delete(issueLabels).where(eq(issueLabels.issueId, id));
    if (labelIds.length > 0) {
      await db.insert(issueLabels).values(labelIds.map(labelId => ({ issueId: id, labelId })));
    }
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(issues).where(eq(issues.id, id));
  return NextResponse.json({ success: true });
}
