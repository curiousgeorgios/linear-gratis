import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, type PublicView } from '@/lib/supabase';
import { resolveLinearTokenForPublicView } from '@/lib/public-view-issue-creation';
import { verifyWebhookSignature } from '@/lib/webhook-signature';
import { clientQuestions } from '@/lib/showcase-client-questions';
import { resolveReviewIntegration, isEligibleReviewIssue } from '@/lib/showcase-review-policy';
import { linearRequest } from '@/lib/linear-request';

const MAX_AGE_MS = 5 * 60 * 1000;
const answerSchema = z.object({
  issueId: z.string().regex(/^[A-Z][A-Z0-9]*-\d+$/),
  answers: z.array(z.object({
    question: z.string().trim().min(1).max(1000),
    answer: z.string().trim().min(1).max(5000),
  })).min(1).max(10),
  respondent: z.object({ name: z.string().trim().min(1).max(200), email: z.string().email().optional() }),
  submittedAt: z.string().datetime(),
});

export async function POST(request: NextRequest, { params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const integration = resolveReviewIntegration(slug);
  if (integration.status === 'missing') return new NextResponse(null, { status: 404 });
  if (integration.status !== 'ready') return NextResponse.json({ error: 'Review integration is not configured.' }, { status: 503 });
  const { policy, secret } = integration;
  const workflow = policy.answers;
  if (!workflow) return new NextResponse(null, { status: 404 });
  const raw = await request.text();
  // Preserve the existing character limit for valid Unicode submissions.
  if (raw.length > 65_000) return NextResponse.json({ error: 'Answers are too long.' }, { status: 413 });
  if (!verifyWebhookSignature(raw, secret, request.headers.get('x-linear-gratis-signature') ?? request.headers.get('x-feedback-signature'))) {
    return NextResponse.json({ error: 'Invalid signature.' }, { status: 401 });
  }
  let decoded: unknown;
  try { decoded = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON.' }, { status: 400 }); }
  const parsed = answerSchema.safeParse(decoded);
  if (!parsed.success || Math.abs(Date.now() - Date.parse(parsed.data.submittedAt)) > MAX_AGE_MS) {
    return NextResponse.json({ error: 'Invalid or expired answers.' }, { status: 400 });
  }

  const { data: view } = await supabaseAdmin.from('public_views').select('*')
    .eq('slug', slug).eq('is_active', true).single();
  if (!view || view.team_id !== policy.teamId || (view.expires_at && Date.parse(view.expires_at) < Date.now())) {
    return new NextResponse(null, { status: 404 });
  }
  const token = await resolveLinearTokenForPublicView(view as PublicView);
  if (!token) return NextResponse.json({ error: 'Linear connection is unavailable.' }, { status: 503 });

  try {
    const issueResult = await linearRequest<{ issue: {
      id: string; identifier: string; description: string | null;
      team: { id: string; states: { nodes: Array<{ id: string; name: string }> } };
      cycle: { id: string } | null; assignee: { id: string } | null; state: { name: string };
    } | null }>(token, `query ShowcaseAnswerIssue($id: String!) {
      issue(id: $id) { id identifier description team { id states { nodes { id name } } }
        cycle { id } assignee { id } state { name } }
    }`, { id: parsed.data.issueId });
    const issue = issueResult.issue;
    if (!issue || issue.identifier !== parsed.data.issueId || !isEligibleReviewIssue(issue, policy, 'answers')) {
      return new NextResponse(null, { status: 404 });
    }
    if (issue.state.name !== workflow.fromState) {
      return NextResponse.json({ error: `This issue is ${issue.state.name}; it is no longer waiting for client answers.`, state: issue.state.name }, { status: 409 });
    }
    const currentQuestions = clientQuestions(issue.description, workflow.questionHeading);
    if (!currentQuestions.length || currentQuestions.length !== parsed.data.answers.length ||
      currentQuestions.some((question, index) => question !== parsed.data.answers[index].question)) {
      return NextResponse.json({ error: 'The questions changed in Linear. Refresh this page before answering.' }, { status: 409 });
    }
    const nextState = issue.team.states.nodes.find((state) => state.name === workflow.toState);
    if (!nextState) return NextResponse.json({ error: `Linear status ${workflow.toState} is unavailable.` }, { status: 503 });
    const body = [
      `**Client answers** from ${parsed.data.respondent.name}`,
      ...parsed.data.answers.map(({ question, answer }, index) =>
        `**${index + 1}. ${question}**\n\n${answer}`),
    ].join('\n\n');
    const commentResult = await linearRequest<{ commentCreate: { success: boolean } }>(token,
      `mutation ShowcaseAnswerComment($input: CommentCreateInput!) { commentCreate(input: $input) { success } }`,
      { input: { issueId: issue.id, body } });
    if (!commentResult.commentCreate.success) throw new Error('Linear did not save the client answers');
    const updateResult = await linearRequest<{ issueUpdate: { success: boolean; issue: { state: { name: string } } | null } }>(token,
      `mutation ShowcaseAnswerState($id: String!, $stateId: String!) {
        issueUpdate(id: $id, input: { stateId: $stateId }) { success issue { state { name } } }
      }`, { id: issue.id, stateId: nextState.id });
    if (!updateResult.issueUpdate.success || updateResult.issueUpdate.issue?.state.name !== workflow.toState) {
      return NextResponse.json({ error: 'Answers were saved in Linear, but the status did not change. Check the issue before retrying.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, state: workflow.toState }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Showcase client answer failed:', error);
    return NextResponse.json({ error: 'Linear could not save these answers. Check the issue before retrying.' }, { status: 502 });
  }
}
