import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const [row] = await db.select().from(projects).where(eq(projects.id, id));
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{
    name: string;
    description: string;
    status: 'backlog' | 'planned' | 'in_progress' | 'completed' | 'cancelled';
    color: string;
    startDate: string;
    targetDate: string;
  }>;
  const { startDate, targetDate, ...rest } = body;
  const [row] = await db.update(projects).set({
    ...rest,
    ...(startDate !== undefined && { startDate: new Date(startDate) }),
    ...(targetDate !== undefined && { targetDate: new Date(targetDate) }),
    updatedAt: new Date(),
  }).where(eq(projects.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(projects).where(eq(projects.id, id));
  return NextResponse.json({ success: true });
}
