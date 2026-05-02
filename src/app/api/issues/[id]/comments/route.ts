import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { comments } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = await db.select().from(comments).where(eq(comments.issueId, id)).orderBy(comments.createdAt);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as { content: string };
  if (!body.content?.trim()) {
    return NextResponse.json({ error: 'content is required' }, { status: 400 });
  }
  const [row] = await db.insert(comments).values({ issueId: id, content: body.content.trim() }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
