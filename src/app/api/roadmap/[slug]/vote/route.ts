import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Roadmap } from '@/lib/supabase';
import crypto from 'crypto';

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}

function getClientIP(request: NextRequest): string {
  // Try various headers for the real IP
  const forwardedFor = request.headers.get('x-forwarded-for');
  if (forwardedFor) {
    return forwardedFor.split(',')[0].trim();
  }

  const realIP = request.headers.get('x-real-ip');
  if (realIP) {
    return realIP;
  }

  const cfConnectingIP = request.headers.get('cf-connecting-ip');
  if (cfConnectingIP) {
    return cfConnectingIP;
  }

  return 'unknown';
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { issueId, fingerprint } = await request.json() as {
      issueId?: string;
      fingerprint?: string;
    };

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    if (!issueId || !fingerprint) {
      return NextResponse.json(
        { error: 'issueId and fingerprint are required' },
        { status: 400 }
      );
    }

    // Check if roadmap exists, is active, and allows voting
    const { data: roadmapData, error: roadmapError } = await supabaseAdmin
      .from('roadmaps')
      .select('id, allow_voting, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (roadmapError || !roadmapData) {
      return NextResponse.json(
        { error: 'Roadmap not found or inactive' },
        { status: 404 }
      );
    }

    const roadmap = roadmapData as Pick<Roadmap, 'id' | 'allow_voting' | 'is_active'>;

    if (!roadmap.allow_voting) {
      return NextResponse.json(
        { error: 'Voting is disabled for this roadmap' },
        { status: 403 }
      );
    }

    // Hash the client IP for additional verification
    const clientIP = getClientIP(request);
    const ipHash = hashIP(clientIP);

    // Try to insert the vote (will fail if duplicate due to UNIQUE constraint)
    const { error: insertError } = await supabaseAdmin
      .from('roadmap_votes')
      .insert({
        roadmap_id: roadmap.id,
        issue_id: issueId,
        visitor_fingerprint: fingerprint,
        ip_hash: ipHash,
      });

    if (insertError) {
      // Check if it's a duplicate error (unique constraint violation)
      if (insertError.code === '23505') {
        return NextResponse.json(
          { error: 'You have already voted for this item' },
          { status: 409 }
        );
      }
      throw insertError;
    }

    // Get the updated vote count for this issue
    const { count } = await supabaseAdmin
      .from('roadmap_votes')
      .select('*', { count: 'exact', head: true })
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueId);

    return NextResponse.json({
      success: true,
      voteCount: count || 1,
    });

  } catch (error) {
    console.error('Vote API error:', error);
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
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { issueId, fingerprint } = await request.json() as {
      issueId?: string;
      fingerprint?: string;
    };

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    if (!issueId || !fingerprint) {
      return NextResponse.json(
        { error: 'issueId and fingerprint are required' },
        { status: 400 }
      );
    }

    // Check if roadmap exists and is active
    const { data: roadmapData, error: roadmapError } = await supabaseAdmin
      .from('roadmaps')
      .select('id, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (roadmapError || !roadmapData) {
      return NextResponse.json(
        { error: 'Roadmap not found or inactive' },
        { status: 404 }
      );
    }

    const roadmap = roadmapData as Pick<Roadmap, 'id' | 'is_active'>;

    // Delete the vote
    const { error: deleteError } = await supabaseAdmin
      .from('roadmap_votes')
      .delete()
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueId)
      .eq('visitor_fingerprint', fingerprint);

    if (deleteError) {
      throw deleteError;
    }

    // Get the updated vote count for this issue
    const { count } = await supabaseAdmin
      .from('roadmap_votes')
      .select('*', { count: 'exact', head: true })
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueId);

    return NextResponse.json({
      success: true,
      voteCount: count || 0,
    });

  } catch (error) {
    console.error('Vote delete API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
