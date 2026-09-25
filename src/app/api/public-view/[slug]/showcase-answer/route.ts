import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { supabaseAdmin, type PublicView } from '@/lib/supabase';
import { resolveLinearTokenForPublicView } from '@/lib/public-view-issue-creation';
import { verifyWebhookSignature } from '@/lib/webhook-signature';
import { clientQuestions } from '@/lib/showcase-client-questions';
import { CYCLE_29_ID, GEORGE_LINEAR_USER_ID, USUAL_SUSPECTS_TEAM_ID } from '@/lib/showcase-review-policy';

const MAX_AGE_MS = 5 * 60 * 1000;
const answerSchema = z.object({
  issueId: z.string().regex(/^USU-\d+$/),
  answers: z.array(z.object({
    question: z.string().trim().min(1).max(1000),
    answer: z.string().trim().min(1).max(5000),
  })).min(1).max(10),
  respondent: z.object({ name: z.string().trim().min(1).max(200), email: z.string().email() }),
  submittedAt: z.string().datetime(),
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
  if (!secret) return NextResponse.json({ error: 'Client answer integration is not configured.' }, { status: 503 });
  const raw = await request.text();
  if (raw.length > 65_000) return NextResponse.json({ error: 'Answers are too long.' }, { status: 413 });
  if (!verifyWebhookSignature(raw, secret, request.headers.get('x-linear-gratis-signature'))) {
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
  if (!view || view.team_id !== USUAL_SUSPECTS_TEAM_ID || (view.expires_at && Date.parse(view.expires_at) < Date.now())) {
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
    if (!issue || issue.identifier !== parsed.data.issueId || issue.team.id !== USUAL_SUSPECTS_TEAM_ID || issue.cycle?.id !== CYCLE_29_ID || issue.assignee?.id !== GEORGE_LINEAR_USER_ID) {
      return new NextResponse(null, { status: 404 });
    }
    if (issue.state.name !== 'With client') {
      return NextResponse.json({ error: `This issue is ${issue.state.name}; it is no longer waiting for client answers.`, state: issue.state.name }, { status: 409 });
    }
    const currentQuestions = clientQuestions(issue.description);
    if (!currentQuestions.length || currentQuestions.length !== parsed.data.answers.length ||
      currentQuestions.some((question, index) => question !== parsed.data.answers[index].question)) {
      return NextResponse.json({ error: 'The questions changed in Linear. Refresh this page before answering.' }, { status: 409 });
    }
    const nextState = issue.team.states.nodes.find((state) => state.name === 'In Progress');
    if (!nextState) return NextResponse.json({ error: 'Linear status In Progress is unavailable.' }, { status: 503 });
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
    if (!updateResult.issueUpdate.success || updateResult.issueUpdate.issue?.state.name !== 'In Progress') {
      return NextResponse.json({ error: 'Answers were saved in Linear, but the status did not change. Check the issue before retrying.' }, { status: 502 });
    }
    return NextResponse.json({ success: true, state: 'In Progress' }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    console.error('Showcase client answer failed:', error);
    return NextResponse.json({ error: 'Linear could not save these answers. Check the issue before retrying.' }, { status: 502 });
  }
}
