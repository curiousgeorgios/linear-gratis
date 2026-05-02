import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { schedules, cronTasks } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [schedule] = await db.select().from(schedules).where(eq(schedules.id, id));
  if (!schedule) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const recentTasks = await db
    .select()
    .from(cronTasks)
    .where(eq(cronTasks.scheduleId, id))
    .orderBy(desc(cronTasks.createdAt))
    .limit(20);

  return NextResponse.json({ data: { ...schedule, cronTasks: recentTasks } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{
    name: string;
    description: string;
    prompt: string;
    cronExpression: string | null;
    workingDirectory: string;
    model: string;
    permissionMode: string;
    enabled: boolean;
  }>;
  const [row] = await db.update(schedules).set({
    ...body,
    updatedAt: new Date(),
  }).where(eq(schedules.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(schedules).where(eq(schedules.id, id));
  return NextResponse.json({ success: true });
}
