import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { Roadmap, RoadmapComment } from '@/lib/supabase';
import crypto from 'crypto';

function hashIP(ip: string): string {
  const salt = process.env.IP_HASH_SALT || 'default-salt';
  return crypto
    .createHash('sha256')
    .update(ip + salt)
    .digest('hex');
}

function getClientIP(request: NextRequest): string {
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const issueId = searchParams.get('issueId');

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    if (!issueId) {
      return NextResponse.json(
        { error: 'issueId query parameter is required' },
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

    // Fetch approved, non-hidden comments for this issue
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('roadmap_comments')
      .select('id, author_name, content, created_at')
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueId)
      .eq('is_approved', true)
      .eq('is_hidden', false)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw commentsError;
    }

    return NextResponse.json({
      success: true,
      comments: comments || [],
    });

  } catch (error) {
    console.error('Comments GET API error:', error);
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
    const body = await request.json() as {
      issueId?: string;
      authorName?: string;
      authorEmail?: string;
      content?: string;
      fingerprint?: string;
    };

    const { issueId, authorName, authorEmail, content, fingerprint } = body;

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    if (!issueId || !authorName || !content) {
      return NextResponse.json(
        { error: 'issueId, authorName, and content are required' },
        { status: 400 }
      );
    }

    // Check if roadmap exists, is active, and allows comments
    const { data: roadmapData, error: roadmapError } = await supabaseAdmin
      .from('roadmaps')
      .select('id, allow_comments, require_email_for_comments, moderate_comments, is_active')
      .eq('slug', slug)
      .eq('is_active', true)
      .single();

    if (roadmapError || !roadmapData) {
      return NextResponse.json(
        { error: 'Roadmap not found or inactive' },
        { status: 404 }
      );
    }

    const roadmap = roadmapData as Pick<Roadmap, 'id' | 'allow_comments' | 'require_email_for_comments' | 'moderate_comments' | 'is_active'>;

    if (!roadmap.allow_comments) {
      return NextResponse.json(
        { error: 'Comments are disabled for this roadmap' },
        { status: 403 }
      );
    }

    // Check email requirement
    if (roadmap.require_email_for_comments && !authorEmail) {
      return NextResponse.json(
        { error: 'Email is required to comment on this roadmap' },
        { status: 400 }
      );
    }

    // Basic email validation
    if (authorEmail && !authorEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      return NextResponse.json(
        { error: 'Invalid email address' },
        { status: 400 }
      );
    }

    // Basic content validation (prevent empty or too long comments)
    const trimmedContent = content.trim();
    if (trimmedContent.length < 1) {
      return NextResponse.json(
        { error: 'Comment cannot be empty' },
        { status: 400 }
      );
    }

    if (trimmedContent.length > 2000) {
      return NextResponse.json(
        { error: 'Comment is too long (max 2000 characters)' },
        { status: 400 }
      );
    }

    // Hash the client IP
    const clientIP = getClientIP(request);
    const ipHash = hashIP(clientIP);

    // Determine if comment should be auto-approved
    const isApproved = !roadmap.moderate_comments;

    // Insert the comment
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('roadmap_comments')
      .insert({
        roadmap_id: roadmap.id,
        issue_id: issueId,
        author_name: authorName.trim(),
        author_email: authorEmail?.trim() || '',
        author_email_verified: false, // TODO: implement email verification
        content: trimmedContent,
        is_approved: isApproved,
        is_hidden: false,
        visitor_fingerprint: fingerprint || null,
        ip_hash: ipHash,
      })
      .select('id, author_name, content, created_at, is_approved')
      .single();

    if (insertError) {
      throw insertError;
    }

    const comment = newComment as Pick<RoadmapComment, 'id' | 'author_name' | 'content' | 'created_at' | 'is_approved'>;

    return NextResponse.json({
      success: true,
      comment: {
        id: comment.id,
        author_name: comment.author_name,
        content: comment.content,
        created_at: comment.created_at,
      },
      pending: !comment.is_approved,
      message: comment.is_approved
        ? 'Comment posted successfully'
        : 'Comment submitted and pending moderation',
    });

  } catch (error) {
    console.error('Comments POST API error:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
