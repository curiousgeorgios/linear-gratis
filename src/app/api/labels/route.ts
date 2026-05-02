import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { labels } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  const rows = teamId
    ? await db.select().from(labels).where(eq(labels.teamId, teamId)).orderBy(labels.name)
    : await db.select().from(labels).orderBy(labels.name);

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { teamId: string; name: string; color?: string };
  if (!body.teamId || !body.name) {
    return NextResponse.json({ error: 'teamId and name are required' }, { status: 400 });
  }
  const [row] = await db.insert(labels).values({
    teamId: body.teamId,
    name: body.name,
    color: body.color ?? '#95A2B3',
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
