import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import type { Roadmap } from '@/lib/supabase';
import bcrypt from 'bcryptjs';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function GET(request: NextRequest) {
  try {
    // Get the user from the Authorization header (Supabase token)
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's token and get their ID
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Fetch user's roadmaps
    const { data: roadmaps, error } = await supabaseAdmin
      .from('roadmaps')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      roadmaps: roadmaps || [],
    });

  } catch (error) {
    console.error('Roadmaps GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the user from the Authorization header
    const authHeader = request.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');

    // Verify the user's token and get their ID
    const { data: { user }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const body = await request.json() as Partial<Roadmap> & { password?: string };

    // Validate required fields
    if (!body.name || !body.slug || !body.title) {
      return NextResponse.json(
        { error: 'name, slug, and title are required' },
        { status: 400 }
      );
    }

    if (!body.project_ids || body.project_ids.length === 0) {
      return NextResponse.json(
        { error: 'At least one project must be selected' },
        { status: 400 }
      );
    }

    // Validate slug format
    const slugRegex = /^[a-z0-9-]+$/;
    if (!slugRegex.test(body.slug)) {
      return NextResponse.json(
        { error: 'Slug must only contain lowercase letters, numbers, and hyphens' },
        { status: 400 }
      );
    }

    // Hash password if provided
    let passwordHash: string | null = null;
    if (body.password_protected && body.password) {
      passwordHash = await bcrypt.hash(body.password, 10);
    }

    // Create the roadmap
    const { data: roadmap, error } = await supabaseAdmin
      .from('roadmaps')
      .insert({
        user_id: user.id,
        name: body.name,
        slug: body.slug,
        title: body.title,
        description: body.description || null,
        layout_type: body.layout_type || 'kanban',
        timeline_granularity: body.timeline_granularity || 'quarter',
        kanban_columns: body.kanban_columns || [
          { key: 'planned', label: 'Planned', state_types: ['backlog', 'unstarted'] },
          { key: 'in_progress', label: 'In progress', state_types: ['started'] },
          { key: 'shipped', label: 'Shipped', state_types: ['completed'] },
        ],
        project_ids: body.project_ids,
        show_item_descriptions: body.show_item_descriptions ?? true,
        show_item_dates: body.show_item_dates ?? true,
        show_vote_counts: body.show_vote_counts ?? true,
        show_comment_counts: body.show_comment_counts ?? true,
        allow_voting: body.allow_voting ?? true,
        allow_comments: body.allow_comments ?? true,
        require_email_for_comments: body.require_email_for_comments ?? true,
        moderate_comments: body.moderate_comments ?? false,
        is_active: true,
        password_protected: body.password_protected || false,
        password_hash: passwordHash,
        expires_at: body.expires_at || null,
      })
      .select()
      .single();

    if (error) {
      // Check for duplicate slug
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A roadmap with this slug already exists' },
          { status: 409 }
        );
      }
      throw error;
    }

    return NextResponse.json({
      success: true,
      roadmap,
    });

  } catch (error) {
    console.error('Roadmaps POST error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
