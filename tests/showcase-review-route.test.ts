import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NextRequest } from 'next/server';
import { createWebhookSignature } from '../src/lib/webhook-signature';
import { CYCLE_29_ID, GEORGE_LINEAR_USER_ID, USUAL_SUSPECTS_TEAM_ID } from '../src/lib/showcase-review-policy';

const view = { team_id: USUAL_SUSPECTS_TEAM_ID, expires_at: null };
const { mock } = require('bun:test') as { mock: { module: (path: string, factory: () => Record<string, unknown>) => void } };
const query = {
  select: () => query,
  eq: () => query,
  single: async () => ({ data: view }),
};
mock.module('@/lib/supabase', () => ({ supabaseAdmin: { from: () => query } }));
mock.module('@/lib/public-view-issue-creation', () => ({ resolveLinearTokenForPublicView: async () => 'test-token' }));

const { POST } = await import('../src/app/api/public-view/[slug]/showcase-review/route');
const originalFetch = globalThis.fetch;
process.env.FEEDBACK_WEBHOOK_SECRET = 'test-secret';

function request(action: string, comment = '') {
  const raw = JSON.stringify({
    issueId: 'USU-69', action, comment,
    reviewer: { name: 'Shane', email: 'shane@example.test' },
    submittedAt: new Date().toISOString(),
  });
  return new NextRequest('https://linear.gratis/api/public-view/usual-suspects/showcase-review', {
    method: 'POST', body: raw,
    headers: { 'x-linear-gratis-signature': createWebhookSignature(raw, 'test-secret') },
  });
}

function issue(cycleId: string | null = CYCLE_29_ID) {
  return { id: 'a2139814-8b41-44dc-b106-b6720f3d8f7c', identifier: 'USU-69',
    team: { id: USUAL_SUSPECTS_TEAM_ID, states: { nodes: [
      { id: 'done-id', name: 'Done' }, { id: 'progress-id', name: 'In Progress' },
      { id: 'cancelled-id', name: 'Canceled' },
    ] } },
    cycle: cycleId ? { id: cycleId } : null,
    assignee: { id: GEORGE_LINEAR_USER_ID }, state: { name: 'In Review' },
  };
}

describe('signed showcase review endpoint', () => {
  test('saves an attributed comment and moves an accepted issue to Done', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
      operations.push(body.query);
      if (body.query.includes('query ShowcaseReviewIssue')) return Response.json({ data: { issue: issue() } });
      if (body.query.includes('mutation ShowcaseReviewComment')) {
        assert.match(JSON.stringify(body.variables), /Showcase review: Accepted.*by Shane\./);
        assert.doesNotMatch(JSON.stringify(body.variables), /shane@example\.test/);
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      assert.equal(body.variables.stateId, 'done-id');
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'Done' } } } } });
    }) as typeof fetch;
    try {
      const response = await POST(request('accept'), { params: Promise.resolve({ slug: 'usual-suspects' }) });
      assert.equal(response.status, 200);
      const result = await response.json() as { success: boolean; state: string };
      assert.equal(result.success, true);
      assert.equal(result.state, 'Done');
      assert.equal(operations.length, 3);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('does not mutate an issue outside Cycle 29', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      operations.push(String(init?.body));
      return Response.json({ data: { issue: issue(null) } });
    }) as typeof fetch;
    try {
      const response = await POST(request('accept'), { params: Promise.resolve({ slug: 'usual-suspects' }) });
      assert.equal(response.status, 404);
      assert.equal(operations.length, 1);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('rejects unsigned requests before touching Linear', async () => {
    const unsigned = new NextRequest('https://linear.gratis/api/public-view/usual-suspects/showcase-review', {
      method: 'POST', body: '{}',
    });
    const response = await POST(unsigned, { params: Promise.resolve({ slug: 'usual-suspects' }) });
    assert.equal(response.status, 401);
  });
});
