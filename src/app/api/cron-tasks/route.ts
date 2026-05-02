import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cronTasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const scheduleId = searchParams.get('scheduleId');
  const limit = parseInt(searchParams.get('limit') ?? '50', 10);

  const rows = scheduleId
    ? await db.select().from(cronTasks).where(eq(cronTasks.scheduleId, scheduleId)).orderBy(desc(cronTasks.createdAt)).limit(limit)
    : await db.select().from(cronTasks).orderBy(desc(cronTasks.createdAt)).limit(limit);

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    scheduleId: string;
    status: string;
    output?: string;
    exitCode?: number;
    startedAt?: string;
    finishedAt?: string;
  };
  if (!body.scheduleId || !body.status) {
    return NextResponse.json({ error: 'scheduleId and status are required' }, { status: 400 });
  }
  const [row] = await db.insert(cronTasks).values({
    scheduleId: body.scheduleId,
    status: body.status,
    output: body.output,
    exitCode: body.exitCode,
    startedAt: body.startedAt ? new Date(body.startedAt) : null,
    finishedAt: body.finishedAt ? new Date(body.finishedAt) : null,
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
