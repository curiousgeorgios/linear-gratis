import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { issueStatuses } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  const rows = teamId
    ? await db.select().from(issueStatuses).where(eq(issueStatuses.teamId, teamId)).orderBy(issueStatuses.position)
    : await db.select().from(issueStatuses).orderBy(issueStatuses.position);

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    teamId: string;
    name: string;
    color?: string;
    type: 'backlog' | 'unstarted' | 'started' | 'completed' | 'cancelled';
    position?: number;
  };
  if (!body.teamId || !body.name || !body.type) {
    return NextResponse.json({ error: 'teamId, name, and type are required' }, { status: 400 });
  }
  const [row] = await db.insert(issueStatuses).values({
    teamId: body.teamId,
    name: body.name,
    color: body.color ?? '#95A2B3',
    type: body.type,
    position: body.position ?? 0,
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
