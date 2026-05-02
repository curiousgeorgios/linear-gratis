import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roadmaps, roadmapProjects, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

export async function GET() {
  const rows = await db.select().from(roadmaps).orderBy(roadmaps.createdAt);
  return NextResponse.json({ data: rows });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as { name: string; description?: string; projectIds?: string[] };
  if (!body.name) return NextResponse.json({ error: 'name is required' }, { status: 400 });

  const [roadmap] = await db.insert(roadmaps).values({
    name: body.name,
    description: body.description,
  }).returning();

  if (body.projectIds?.length) {
    await db.insert(roadmapProjects).values(
      body.projectIds.map(projectId => ({ roadmapId: roadmap.id, projectId }))
    );
  }

  return NextResponse.json({ data: roadmap }, { status: 201 });
}
