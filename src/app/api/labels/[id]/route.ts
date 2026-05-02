import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { labels } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{ name: string; color: string }>;
  const [row] = await db.update(labels).set(body).where(eq(labels.id, id)).returning();
  if (!row) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  return NextResponse.json({ data: row });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(labels).where(eq(labels.id, id));
  return NextResponse.json({ success: true });
}
