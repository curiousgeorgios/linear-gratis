import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { teamMembers, teams } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id: userId } = await params;
  const rows = await db
    .select({ team: teams, role: teamMembers.role })
    .from(teamMembers)
    .innerJoin(teams, eq(teamMembers.teamId, teams.id))
    .where(eq(teamMembers.userId, userId));
  const data = rows.map(r => ({ ...r.team, role: r.role }));
  return NextResponse.json({ data });
}
