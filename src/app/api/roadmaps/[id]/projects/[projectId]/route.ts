import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roadmapProjects } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

type Params = { params: Promise<{ id: string; projectId: string }> };

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id, projectId } = await params;
  await db.delete(roadmapProjects)
    .where(and(eq(roadmapProjects.roadmapId, id), eq(roadmapProjects.projectId, projectId)));
  return NextResponse.json({ success: true });
}
