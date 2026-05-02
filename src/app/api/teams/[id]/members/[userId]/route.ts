import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamMembers } from '@/db/schema';
import { and, eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string; userId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id: teamId, userId } = await params;
  await db.delete(teamMembers).where(and(eq(teamMembers.teamId, teamId), eq(teamMembers.userId, userId)));
  return NextResponse.json({ success: true });
}
