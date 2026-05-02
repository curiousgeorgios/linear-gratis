import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { cronTasks } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [row] = await db.select().from(cronTasks).where(eq(cronTasks.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{
    status: string;
    output: string;
    exitCode: number;
    startedAt: string;
    finishedAt: string;
  }>;
  const { startedAt, finishedAt, ...rest } = body;
  const [row] = await db.update(cronTasks).set({
    ...rest,
    ...(startedAt !== undefined && { startedAt: startedAt ? new Date(startedAt) : null }),
    ...(finishedAt !== undefined && { finishedAt: finishedAt ? new Date(finishedAt) : null }),
  }).where(eq(cronTasks.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}
