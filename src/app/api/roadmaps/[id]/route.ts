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

async function verifyUser(request: NextRequest) {
  const authHeader = request.headers.get('Authorization');
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }

  const token = authHeader.replace('Bearer ', '');
  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    const { data: roadmap, error } = await supabaseAdmin
      .from('roadmaps')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (error || !roadmap) {
      return NextResponse.json(
        { error: 'Roadmap not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      roadmap,
    });

  } catch (error) {
    console.error('Roadmap GET error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Check ownership
    const { data: existing, error: checkError } = await supabaseAdmin
      .from('roadmaps')
      .select('id, user_id')
      .eq('id', id)
      .eq('user_id', user.id)
      .single();

    if (checkError || !existing) {
      return NextResponse.json(
        { error: 'Roadmap not found' },
        { status: 404 }
      );
    }

    const body = await request.json() as Partial<Roadmap> & { password?: string };

    // Build update object
    const updateData: Record<string, unknown> = {};

    if (body.name !== undefined) updateData.name = body.name;
    if (body.title !== undefined) updateData.title = body.title;
    if (body.description !== undefined) updateData.description = body.description;
    if (body.layout_type !== undefined) updateData.layout_type = body.layout_type;
    if (body.timeline_granularity !== undefined) updateData.timeline_granularity = body.timeline_granularity;
    if (body.kanban_columns !== undefined) updateData.kanban_columns = body.kanban_columns;
    if (body.project_ids !== undefined) updateData.project_ids = body.project_ids;
    if (body.show_item_descriptions !== undefined) updateData.show_item_descriptions = body.show_item_descriptions;
    if (body.show_item_dates !== undefined) updateData.show_item_dates = body.show_item_dates;
    if (body.show_vote_counts !== undefined) updateData.show_vote_counts = body.show_vote_counts;
    if (body.show_comment_counts !== undefined) updateData.show_comment_counts = body.show_comment_counts;
    if (body.allow_voting !== undefined) updateData.allow_voting = body.allow_voting;
    if (body.allow_comments !== undefined) updateData.allow_comments = body.allow_comments;
    if (body.require_email_for_comments !== undefined) updateData.require_email_for_comments = body.require_email_for_comments;
    if (body.moderate_comments !== undefined) updateData.moderate_comments = body.moderate_comments;
    if (body.is_active !== undefined) updateData.is_active = body.is_active;
    if (body.expires_at !== undefined) updateData.expires_at = body.expires_at;

    // Handle password changes
    if (body.password_protected !== undefined) {
      updateData.password_protected = body.password_protected;
      if (!body.password_protected) {
        updateData.password_hash = null;
      } else if (body.password) {
        updateData.password_hash = await bcrypt.hash(body.password, 10);
      }
    }

    const { data: roadmap, error } = await supabaseAdmin
      .from('roadmaps')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
      roadmap,
    });

  } catch (error) {
    console.error('Roadmap PATCH error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const user = await verifyUser(request);

    if (!user) {
      return NextResponse.json({ error: 'Unauthorised' }, { status: 401 });
    }

    // Delete the roadmap (votes and comments will cascade delete)
    const { error } = await supabaseAdmin
      .from('roadmaps')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({
      success: true,
    });

  } catch (error) {
    console.error('Roadmap DELETE error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
