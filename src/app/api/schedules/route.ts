import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { schedules } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const teamId = searchParams.get('teamId');

  const rows = teamId
    ? await db.select().from(schedules).where(eq(schedules.teamId, teamId)).orderBy(desc(schedules.createdAt))
    : await db.select().from(schedules).orderBy(desc(schedules.createdAt));

  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as {
    teamId: string;
    name: string;
    prompt: string;
    workingDirectory: string;
    description?: string;
    cronExpression?: string;
    model?: string;
    permissionMode?: string;
    enabled?: boolean;
  };
  if (!body.teamId || !body.name || !body.prompt || !body.workingDirectory) {
    return NextResponse.json(
      { error: 'teamId, name, prompt, and workingDirectory are required' },
      { status: 400 }
    );
  }
  const [row] = await db.insert(schedules).values({
    teamId: body.teamId,
    name: body.name,
    prompt: body.prompt,
    workingDirectory: body.workingDirectory,
    description: body.description,
    cronExpression: body.cronExpression ?? null,
    model: body.model ?? 'claude-sonnet-4-6',
    permissionMode: body.permissionMode ?? 'ask',
    enabled: body.enabled ?? true,
  }).returning();
  return NextResponse.json({ data: row }, { status: 201 });
}
