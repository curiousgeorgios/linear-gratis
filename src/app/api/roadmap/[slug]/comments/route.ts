import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import type { RoadmapComment } from '@/lib/supabase';
import { authoriseRoadmap } from '@/lib/roadmap-auth';
import { resolveRoadmapIssue } from '@/lib/roadmap-issue-access';
import { checkRateLimit, getClientIp, hashIp, rateLimitResponse } from '@/lib/request-security';
import * as z from 'zod';

const issueIdSchema = z.string().trim().min(1).max(120);
const commentCreateSchema = z.object({
  issueId: issueIdSchema,
  authorName: z.string().trim().min(1).max(120),
  authorEmail: z.string().trim().max(320).optional(),
  content: z.string().trim().min(1).max(2000),
  fingerprint: z.string().trim().max(200).optional(),
});

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await params;
    const { searchParams } = new URL(request.url);
    const parsedIssueId = issueIdSchema.safeParse(searchParams.get('issueId'));

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    if (!parsedIssueId.success) {
      return NextResponse.json(
        { error: 'issueId query parameter is required' },
        { status: 400 }
      );
    }

    // Auth first: is_active + expiry + password cookie. Comments on a
    // password-protected roadmap should require the cookie the main POST
    // issued.
    const auth = await authoriseRoadmap(slug, request);
    if (!auth.ok) return auth.response;
    const roadmap = auth.roadmap;

    const issueAccess = await resolveRoadmapIssue(roadmap, parsedIssueId.data);
    if (!issueAccess.ok) return issueAccess.response;

    // Fetch approved, non-hidden comments for this issue
    const { data: comments, error: commentsError } = await supabaseAdmin
      .from('roadmap_comments')
      .select('id, author_name, content, created_at')
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueAccess.issueId)
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

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`roadmap-comment:${slug}:${clientIp}`, {
      limit: 5,
      windowMs: 10 * 60 * 1000,
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds);

    const parsed = commentCreateSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'issueId, authorName, and content are required' },
        { status: 400 }
      );
    }
    const { issueId, authorName, content, fingerprint } = parsed.data;
    const authorEmail = parsed.data.authorEmail?.trim() || '';

    // Auth first: is_active + expiry + password cookie.
    const auth = await authoriseRoadmap(slug, request);
    if (!auth.ok) return auth.response;
    const roadmap = auth.roadmap;

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

    const issueAccess = await resolveRoadmapIssue(roadmap, issueId);
    if (!issueAccess.ok) return issueAccess.response;

    // Hash the client IP
    const ipHash = hashIp(clientIp);

    // Determine if comment should be auto-approved
    const isApproved = !roadmap.moderate_comments;

    // Insert the comment
    const { data: newComment, error: insertError } = await supabaseAdmin
      .from('roadmap_comments')
      .insert({
        roadmap_id: roadmap.id,
        issue_id: issueAccess.issueId,
        author_name: authorName.trim(),
        author_email: authorEmail,
        author_email_verified: false, // TODO: implement email verification
        content,
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
