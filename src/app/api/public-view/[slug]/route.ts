import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { decryptToken } from '@/lib/encryption';
import bcrypt from 'bcryptjs';

export const runtime = 'edge';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Check if view exists and is active
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

    // Check if view has expired
    if (viewData.expires_at && new Date(viewData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This public view has expired' },
        { status: 410 }
      );
    }

    // Check if view requires password
    if (viewData.password_protected) {
      return NextResponse.json(
        { error: 'Password required', requiresPassword: true },
        { status: 401 }
      );
    }

    // Get the user's Linear token
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', viewData.user_id)
      .single();

    if (profileError || !profileData?.linear_api_token) {
      return NextResponse.json(
        { error: 'Unable to load data - Linear API token not found' },
        { status: 500 }
      );
    }

    // Decrypt the token and fetch issues
    const decryptedToken = decryptToken(profileData.linear_api_token);

    const requestBody: Record<string, unknown> = {
      apiToken: decryptedToken
    };

    if (viewData.project_id) {
      requestBody.projectId = viewData.project_id;
    } else if (viewData.team_id) {
      requestBody.teamId = viewData.team_id;
    }

    if (viewData.allowed_statuses && viewData.allowed_statuses.length > 0) {
      requestBody.statuses = viewData.allowed_statuses;
    }

    // Fetch issues from Linear
    const issuesResponse = await fetch(`${request.nextUrl.origin}/api/linear/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!issuesResponse.ok) {
      throw new Error('Failed to fetch issues from Linear');
    }

    const issuesData = await issuesResponse.json() as { issues?: unknown[] };

    return NextResponse.json({
      success: true,
      view: {
        id: viewData.id,
        name: viewData.name,
        slug: viewData.slug,
        view_title: viewData.view_title,
        description: viewData.description,
        project_name: viewData.project_name,
        team_name: viewData.team_name,
        show_assignees: viewData.show_assignees,
        show_labels: viewData.show_labels,
        show_priorities: viewData.show_priorities,
        show_descriptions: viewData.show_descriptions,
        allow_issue_creation: viewData.allow_issue_creation,
        created_at: viewData.created_at
      },
      issues: issuesData.issues || []
    });

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
    const resolvedParams = await params;
    const { slug } = resolvedParams;
    const { password } = await request.json() as { password?: string };

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    // Check if view exists and is active
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

    // Check password if view is password protected
    if (viewData.password_protected) {
      if (!password) {
        return NextResponse.json(
          { error: 'Password required', requiresPassword: true },
          { status: 401 }
        );
      }

      // Check password against hash
      const isPasswordValid = await bcrypt.compare(password, viewData.password_hash);
      if (!isPasswordValid) {
        return NextResponse.json(
          { error: 'Invalid password', requiresPassword: true },
          { status: 401 }
        );
      }
    }

    // Check if view has expired
    if (viewData.expires_at && new Date(viewData.expires_at) < new Date()) {
      return NextResponse.json(
        { error: 'This public view has expired' },
        { status: 410 }
      );
    }

    // Get the user's Linear token
    const { data: profileData, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('linear_api_token')
      .eq('id', viewData.user_id)
      .single();

    if (profileError || !profileData?.linear_api_token) {
      return NextResponse.json(
        { error: 'Unable to load data - Linear API token not found' },
        { status: 500 }
      );
    }

    // Decrypt the token and fetch issues
    const decryptedToken = decryptToken(profileData.linear_api_token);

    const requestBody: Record<string, unknown> = {
      apiToken: decryptedToken
    };

    if (viewData.project_id) {
      requestBody.projectId = viewData.project_id;
    } else if (viewData.team_id) {
      requestBody.teamId = viewData.team_id;
    }

    if (viewData.allowed_statuses && viewData.allowed_statuses.length > 0) {
      requestBody.statuses = viewData.allowed_statuses;
    }

    // Fetch issues from Linear
    const issuesResponse = await fetch(`${request.nextUrl.origin}/api/linear/issues`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!issuesResponse.ok) {
      throw new Error('Failed to fetch issues from Linear');
    }

    const issuesData = await issuesResponse.json() as { issues?: unknown[] };

    return NextResponse.json({
      success: true,
      view: {
        id: viewData.id,
        name: viewData.name,
        slug: viewData.slug,
        view_title: viewData.view_title,
        description: viewData.description,
        project_name: viewData.project_name,
        team_name: viewData.team_name,
        show_assignees: viewData.show_assignees,
        show_labels: viewData.show_labels,
        show_priorities: viewData.show_priorities,
        show_descriptions: viewData.show_descriptions,
        password_protected: viewData.password_protected,
        allow_issue_creation: viewData.allow_issue_creation,
        created_at: viewData.created_at
      },
      issues: issuesData.issues || []
    });

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