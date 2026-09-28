import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, type PublicView } from '@/lib/supabase';
import { resolveLinearTokenForPublicView } from '@/lib/public-view-issue-creation';
import { verifyWebhookSignature } from '@/lib/webhook-signature';
import {
  USUAL_SUSPECTS_TEAM_ID, isEligibleCycle29Issue,
  isReviewableCycle29Issue, nextReviewState,
} from '@/lib/showcase-review-policy';

import { confirmedReviewIssue, hasCurrentConfirmedReview } from '@/lib/confirmed-showcase-review';

const MAX_AGE_MS = 5 * 60 * 1000;

const reviewSchema = z.object({
  issueId: z.string().regex(/^USU-\d+$/),
  action: z.enum(['accept', 'changes', 'reject', 'no-longer-needed']),
  comment: z.string().trim().max(5000),
  reviewer: z.object({ name: z.string().trim().min(1).max(200), email: z.string().email() }),
  submittedAt: z.string().datetime(),
  release: z.object({ version: z.string().max(100), commit: z.string().regex(/^[a-f0-9]{40}$/) }).optional(),
}).refine((value) => value.action === 'accept' || value.comment.length > 0, {
  message: 'Explain the requested change or cancellation.',
  path: ['comment'],
});

type GraphQLResult<T> = { data?: T; errors?: Array<{ message: string }> };

async function linearRequest<T>(token: string, query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch('https://api.linear.app/graphql', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: token.trim() },
    body: JSON.stringify({ query, variables }),
  });
  if (!response.ok) throw new Error(`Linear returned ${response.status}`);
  const result = await response.json() as GraphQLResult<T>;
  if (result.errors?.length || !result.data) throw new Error(result.errors?.map((error) => error.message).join('; ') || 'Linear returned no data');
  return result.data;
}

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug !== 'usual-suspects') return new NextResponse(null, { status: 404 });
  const secret = process.env.FEEDBACK_WEBHOOK_SECRET;
  if (!secret) return NextResponse.json({ error: 'Review integration is not configured.' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 7000) return NextResponse.json({ error: 'Review is too long.' }, { status: 413 });
  if (!verifyWebhookSignature(raw, secret, request.headers.get('x-linear-gratis-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = reviewSchema.safeParse(decoded);
  if (!parsed.success || Math.abs(Date.now() - Date.parse(parsed.data.submittedAt)) > MAX_AGE_MS) {
    return NextResponse.json({ error: 'Invalid or expired review.' }, { status: 400 });
  }

  const { data: view } = await supabaseAdmin.from('public_views').select('*')
    .eq('slug', slug).eq('is_active', true).single();
  if (!view || view.team_id !== USUAL_SUSPECTS_TEAM_ID || (view.expires_at && Date.parse(view.expires_at) < Date.now())) {
    return new NextResponse(null, { status: 404 });
  }
  const token = await resolveLinearTokenForPublicView(view as PublicView);
  if (!token) return NextResponse.json({ error: 'Linear connection is unavailable.' }, { status: 503 });

  try {
    const issueResult = await linearRequest<{ issue: {
      id: string; identifier: string; description: string | null;
      team: { id: string; states: { nodes: Array<{ id: string; name: string }> } };
      cycle: { id: string } | null;
      assignee: { id: string } | null;
      state: { name: string };
    } | null }>(token, `query ShowcaseReviewIssue($id: String!) {
      issue(id: $id) { id identifier description team { id states { nodes { id name } } }
        cycle { id } assignee { id } state { name } }
    }`, { id: parsed.data.issueId });
    const issue = issueResult.issue;
    if (!issue || !isEligibleCycle29Issue(issue)) {
      return new NextResponse(null, { status: 404 });
    }
    if (!isReviewableCycle29Issue(issue)) {
      return NextResponse.json({ error: `This issue is ${issue.state.name}; only issues in review can receive a decision.`, state: issue.state.name }, { status: 409 });
    }
    if (!hasCurrentConfirmedReview(issue, parsed.data.release)) {
      return NextResponse.json({ error: 'This review scope or release has changed. Refresh the showcase after the release is published.' }, { status: 409 });
    }
    const nextStateName = nextReviewState(parsed.data.action);
    const nextState = issue.team.states.nodes.find((state) => state.name === nextStateName);
    if (!nextState) return NextResponse.json({ error: `Linear status ${nextStateName} is unavailable.` }, { status: 503 });
    const verb = {
      accept: 'Accepted', changes: 'Changes requested', reject: 'Rejected',
      'no-longer-needed': 'No longer needed',
    }[parsed.data.action];
    const confirmed = confirmedReviewIssue(issue.identifier, issue.id);
    const releaseNote = confirmed && parsed.data.release ? `\n\nReviewed scope: ${confirmed.scope}\n\nRelease: ${parsed.data.release.commit} (${parsed.data.release.version}); source items: ${confirmed.localIds.join(", ")}.` : "";
    const body = `**Showcase review: ${verb}** by ${parsed.data.reviewer.name}.${parsed.data.comment ? `\n\n${parsed.data.comment}` : ''}${releaseNote}`;
    const commentResult = await linearRequest<{ commentCreate: { success: boolean } }>(token,
      `mutation ShowcaseReviewComment($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
      { input: { issueId: issue.id, body } });
    if (!commentResult.commentCreate.success) throw new Error('Linear did not save the review comment');
    const updateResult = await linearRequest<{ issueUpdate: { success: boolean; issue: { state: { name: string } } | null } }>(token,
      `mutation ShowcaseReviewState($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) { success issue { state { name } } }
      }`, { id: issue.id, stateId: nextState.id });
    if (!updateResult.issueUpdate.success || updateResult.issueUpdate.issue?.state.name !== nextStateName) {
      return NextResponse.json({ error: 'The review comment was saved, but Linear did not change the issue status. Please check Linear before retrying.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, state: nextStateName }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Showcase review failed:', error);
    return NextResponse.json({ error: 'Linear could not save this review. Please retry or open the issue in Linear.' }, { status: 502 });
  }
}
