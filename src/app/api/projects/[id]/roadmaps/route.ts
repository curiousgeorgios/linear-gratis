import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roadmapProjects, roadmaps } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const rows = await db
    .select({ id: roadmaps.id, name: roadmaps.name })
    .from(roadmapProjects)
    .innerJoin(roadmaps, eq(roadmapProjects.roadmapId, roadmaps.id))
    .where(eq(roadmapProjects.projectId, id));
  return NextResponse.json({ data: rows });
}
