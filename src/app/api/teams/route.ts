import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teams, issueStatuses } from '@/db/schema';

const DEFAULT_STATUSES = [
  { name: 'Backlog',     color: '#95A2B3', type: 'backlog'    as const, position: 0 },
  { name: 'Todo',        color: '#E2E8F0', type: 'unstarted'  as const, position: 1 },
  { name: 'In Progress', color: '#F59E0B', type: 'started'    as const, position: 2 },
  { name: 'Done',        color: '#10B981', type: 'completed'  as const, position: 3 },
  { name: 'Cancelled',   color: '#6B7280', type: 'cancelled'  as const, position: 4 },
];

export async function GET() {
  const rows = await db.select().from(teams).orderBy(teams.createdAt);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; identifier: string; description?: string; color?: string };
  if (!body.name || !body.identifier) {
    return NextResponse.json({ error: 'name and identifier are required' }, { status: 400 });
  }
  const [row] = await db.insert(teams).values({
    name: body.name,
    identifier: body.identifier.toUpperCase(),
    description: body.description,
    color: body.color,
  }).returning();

  await db.insert(issueStatuses).values(
    DEFAULT_STATUSES.map(s => ({ ...s, teamId: row.id }))
  );

  return NextResponse.json({ data: row }, { status: 201 });
}
