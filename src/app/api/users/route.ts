import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { users } from '@/db/schema';

export async function GET() {
  const rows = await db.select().from(users).orderBy(users.createdAt);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; email: string; avatarUrl?: string };
  if (!body.name || !body.email) {
    return NextResponse.json({ error: 'name and email are required' }, { status: 400 });
  }
  const [row] = await db.insert(users).values({
    name: body.name,
    email: body.email,
    avatarUrl: body.avatarUrl,
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
