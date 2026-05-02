import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { roadmaps, roadmapProjects, projects } from '@/db/schema';
import { eq } from 'drizzle-orm';

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const [roadmap] = await db.select().from(roadmaps).where(eq(roadmaps.id, id));
  if (!roadmap) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const projectRows = await db
    .select({
      id: projects.id,
      name: projects.name,
      description: projects.description,
      status: projects.status,
      color: projects.color,
      startDate: projects.startDate,
      targetDate: projects.targetDate,
    })
    .from(roadmapProjects)
    .innerJoin(projects, eq(roadmapProjects.projectId, projects.id))
    .where(eq(roadmapProjects.roadmapId, id));

  return NextResponse.json({ data: { ...roadmap, projects: projectRows } });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json() as Partial<{ name: string; description: string; projectIds: string[] }>;
  const { projectIds, ...fields } = body;

  const [updated] = await db.update(roadmaps)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(roadmaps.id, id))
    .returning();

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  if (projectIds !== undefined) {
    await db.delete(roadmapProjects).where(eq(roadmapProjects.roadmapId, id));
    if (projectIds.length > 0) {
      await db.insert(roadmapProjects).values(projectIds.map(projectId => ({ roadmapId: id, projectId })));
    }
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await db.delete(roadmaps).where(eq(roadmaps.id, id));
  return NextResponse.json({ success: true });
}
