import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamMembers, users } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: teamId } = await params;
  const rows = await db
    .select({ member: teamMembers, user: users })
    .from(teamMembers)
    .innerJoin(users, eq(teamMembers.userId, users.id))
    .where(eq(teamMembers.teamId, teamId));
  const data = rows.map(r => ({ ...r.user, role: r.member.role, joinedAt: r.member.joinedAt }));
  return NextResponse.json({ data });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id: teamId } = await params;
  const body = await req.json() as { userId: string; role?: string };
  if (!body.userId) return NextResponse.json({ error: 'userId is required' }, { status: 400 });
  await db.insert(teamMembers).values({ teamId, userId: body.userId, role: body.role ?? 'member' })
    .onConflictDoNothing();
  return NextResponse.json({ success: true }, { status: 201 });
}
