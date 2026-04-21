import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { PublicView } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import { fetchLinearIssues } from '@/lib/linear';
import {
  authorisePublicView,
  setPublicViewAccessCookie,
} from '@/lib/public-view-auth';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const auth = await authorisePublicView(slug, request);
    if (!auth.ok) return auth.response;

    return await respondWithViewPayload(auth.view);
  } catch (error) {
    console.error('Public view API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { password } = (await request.json()) as { password?: string };

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Load the row. POST manages its own flow because it may be the caller
    // that actually sets the cookie, so we do not delegate to the helper.
    const { data: viewData, error: viewError } = await supabaseAdmin
      .from('public_views')
      .select('*')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (viewError || !viewData) {
      return NextResponse.json(
        { error: 'Public view not found or inactive' },
        { status: 404 }
      );
    }

    const view = viewData as PublicView;

    // Expiry BEFORE password so expired rows never run bcrypt.
    if (view.expires_at && new Date(view.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This public view has expired' },
        { status: 410 }
      );
    }

    if (!view.password_protected || !view.password_hash) {
      return NextResponse.json(
        { error: 'View is not password protected' },
        { status: 400 }
      );
    }

    if (!password) {
      return NextResponse.json(
        { error: 'Password required', requiresPassword: true },
        { status: 401 }
      );
    }

    const bcrypt = (await import('bcryptjs')).default;
    const isPasswordValid = await bcrypt.compare(password, view.password_hash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid password', requiresPassword: true },
        { status: 401 }
      );
    }

    const response = await respondWithViewPayload(view);
    // Only set the access cookie on a 2xx response so we do not vouch for a
    // caller whose Linear fetch blew up.
    if (response.status >= 200 && response.status < 300) {
      setPublicViewAccessCookie(response, view);
    }
    return response;
  } catch (error) {
    console.error('Public view password validation error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

async function respondWithViewPayload(view: PublicView): Promise<NextResponse> {
  const { data: profileData, error: profileError } = await supabaseAdmin
    .from('profiles')
    .select('linear_api_token')
    .eq('id', view.user_id)
    .single();

  if (profileError || !profileData?.linear_api_token) {
    return NextResponse.json(
      { error: 'Unable to load data - Linear API token not found' },
      { status: 500 }
    );
  }

  const decryptedToken = decryptToken(profileData.linear_api_token);

  const issuesResult = await fetchLinearIssues(decryptedToken, {
    projectId: view.project_id || undefined,
    teamId: view.team_id || undefined,
    statuses:
      view.allowed_statuses?.length > 0 ? view.allowed_statuses : undefined,
  });

  if (!issuesResult.success) {
    throw new Error(`Failed to fetch issues from Linear: ${issuesResult.error}`);
  }

  // Strip out any issues the view owner has excluded. Filtering happens
  // server-side so excluded IDs never leave the server.
  const excludedIds = new Set<string>(view.excluded_issue_ids ?? []);
  const visibleIssues =
    excludedIds.size > 0
      ? issuesResult.issues.filter((issue) => !excludedIds.has(issue.id))
      : issuesResult.issues;

  return NextResponse.json({
    success: true,
    view: {
      id: view.id,
      user_id: view.user_id,
      name: view.name,
      slug: view.slug,
      view_title: view.view_title,
      description: view.description,
      project_id: view.project_id,
      project_name: view.project_name,
      team_id: view.team_id,
      team_name: view.team_name,
      show_assignees: view.show_assignees,
      show_labels: view.show_labels,
      show_priorities: view.show_priorities,
      show_descriptions: view.show_descriptions,
      show_comments: view.show_comments ?? false,
      show_activity: view.show_activity ?? false,
      show_project_updates: view.show_project_updates ?? true,
      password_protected: view.password_protected,
      allow_issue_creation: view.allow_issue_creation,
      created_at: view.created_at,
    },
    issues: visibleIssues,
  });
}
