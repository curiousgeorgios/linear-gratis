import { NextRequest, NextResponse } from 'next/server';
import { getAuthenticatedLinearToken } from '@/lib/linear-auth';
import { fetchAvailableIssueTemplates } from '@/lib/linear-templates';

type TemplatesRequest = {
  projectId?: string;
  teamId?: string;
};

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthenticatedLinearToken();
    if (!auth.ok) return auth.response;

    const { projectId, teamId }: TemplatesRequest = await request.json();

    const result = await fetchAvailableIssueTemplates(auth.linearToken, {
      projectId: projectId || null,
      teamId: teamId || null,
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 400 },
      );
    }

    return NextResponse.json({ success: true, templates: result.templates });
  } catch (error) {
    console.error('Templates API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      },
      { status: 500 },
    );
  }
}
