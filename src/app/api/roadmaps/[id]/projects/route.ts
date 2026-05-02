import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roadmapProjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const { projectId } = await req.json() as { projectId: string };
  if (!projectId) return NextResponse.json({ error: 'projectId is required' }, { status: 400 });

  // Ignore if already linked
  const existing = await db.select().from(roadmapProjects)
    .where(and(eq(roadmapProjects.roadmapId, id), eq(roadmapProjects.projectId, projectId)));

  if (existing.length === 0) {
    await db.insert(roadmapProjects).values({ roadmapId: id, projectId });
  }

  return NextResponse.json({ success: true }, { status: 201 });
}
