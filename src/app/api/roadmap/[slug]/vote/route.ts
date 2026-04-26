import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { authoriseRoadmap } from '@/lib/roadmap-auth';
import { resolveRoadmapIssue } from '@/lib/roadmap-issue-access';
import { checkRateLimit, getClientIp, hashIp, rateLimitResponse } from '@/lib/request-security';
import * as z from 'zod';

const voteSchema = z.object({
  issueId: z.string().trim().min(1).max(120),
  fingerprint: z.string().trim().min(16).max(200),
});

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
    const rateLimit = await checkRateLimit(`roadmap-vote:${slug}:${clientIp}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds);

    const parsed = voteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'issueId and fingerprint are required' },
        { status: 400 }
      );
    }
    const { issueId, fingerprint } = parsed.data;

    // Auth first: is_active + expiry + password cookie. Visitors authenticate
    // via the main roadmap password POST which sets the rm_access cookie, so
    // password-protected roadmaps stay gated here too.
    const auth = await authoriseRoadmap(slug, request);
    if (!auth.ok) return auth.response;
    const roadmap = auth.roadmap;

    if (!roadmap.allow_voting) {
      return NextResponse.json(
        { error: 'Voting is disabled for this roadmap' },
        { status: 403 }
      );
    }

    const issueAccess = await resolveRoadmapIssue(roadmap, issueId);
    if (!issueAccess.ok) return issueAccess.response;

    // Hash the client IP for additional verification
    const ipHash = hashIp(clientIp);

    // Try to insert the vote (will fail if duplicate due to UNIQUE constraint)
    const { error: insertError } = await supabaseAdmin
      .from('roadmap_votes')
      .insert({
        roadmap_id: roadmap.id,
        issue_id: issueAccess.issueId,
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
      .eq('issue_id', issueAccess.issueId);

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

    if (!slug) {
      return NextResponse.json(
        { error: 'Slug parameter is required' },
        { status: 400 }
      );
    }

    const clientIp = getClientIp(request);
    const rateLimit = await checkRateLimit(`roadmap-vote-delete:${slug}:${clientIp}`, {
      limit: 60,
      windowMs: 60 * 60 * 1000,
    });
    if (!rateLimit.ok) return rateLimitResponse(rateLimit.retryAfterSeconds);

    const parsed = voteSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'issueId and fingerprint are required' },
        { status: 400 }
      );
    }
    const { issueId, fingerprint } = parsed.data;

    // Auth first: is_active + expiry + password cookie.
    const auth = await authoriseRoadmap(slug, request);
    if (!auth.ok) return auth.response;
    const roadmap = auth.roadmap;

    const issueAccess = await resolveRoadmapIssue(roadmap, issueId);
    if (!issueAccess.ok) return issueAccess.response;

    // Delete the vote
    const { error: deleteError } = await supabaseAdmin
      .from('roadmap_votes')
      .delete()
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueAccess.issueId)
      .eq('visitor_fingerprint', fingerprint);

    if (deleteError) {
      throw deleteError;
    }

    // Get the updated vote count for this issue
    const { count } = await supabaseAdmin
      .from('roadmap_votes')
      .select('*', { count: 'exact', head: true })
      .eq('roadmap_id', roadmap.id)
      .eq('issue_id', issueAccess.issueId);

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
