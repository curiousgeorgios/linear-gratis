import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NextRequest } from 'next/server';
import { createWebhookSignature } from '../src/lib/webhook-signature';
import { CYCLE_ID, ASSIGNEE_ID, TEAM_ID, integrationConfig } from './helpers/review-integration';

let view: { team_id: string; expires_at: string | null } | null = { team_id: TEAM_ID, expires_at: null };
let token: string | null = 'test-token';
const { mock } = require('bun:test') as { mock: { module: (path: string, factory: () => Record<string, unknown>) => void } };
const query = {
  select: () => query,
  eq: () => query,
  single: async () => ({ data: view }),
};
mock.module('@/lib/supabase', () => ({ supabaseAdmin: { from: () => query } }));
mock.module('@/lib/public-view-issue-creation', () => ({ resolveLinearTokenForPublicView: async () => token }));

const { POST } = await import('../src/app/api/public-view/[slug]/showcase-review/route');
const originalFetch = globalThis.fetch;
delete process.env.REVIEW_INTEGRATIONS_GZIP_BASE64;
process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify(integrationConfig);
process.env.DEMO_REVIEW_SECRET = 'test-secret';

function request(action: string, comment = '') {
  const raw = JSON.stringify({
    issueId: 'DEMO-69', action, comment,
    reviewer: { name: 'Alex', email: 'alex@example.test' },
    submittedAt: new Date().toISOString(),
  });
  return new NextRequest('https://linear.gratis/api/public-view/demo/showcase-review', {
    method: 'POST', body: raw,
    headers: { 'x-linear-gratis-signature': createWebhookSignature(raw, 'test-secret') },
  });
}

function issue(cycleId: string | null = CYCLE_ID) {
  return { id: '44444444-4444-4444-8444-444444444444', identifier: 'DEMO-69',
    team: { id: TEAM_ID, states: { nodes: [
      { id: 'done-id', name: 'Done' }, { id: 'progress-id', name: 'In Progress' },
      { id: 'cancelled-id', name: 'Canceled' },
    ] } },
    cycle: cycleId ? { id: cycleId } : null,
    assignee: { id: ASSIGNEE_ID }, state: { name: 'In Review' },
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
        assert.match(JSON.stringify(body.variables), /Showcase review: Accepted.*by Alex\./);
        assert.doesNotMatch(JSON.stringify(body.variables), /alex@example\.test/);
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      assert.equal(body.variables.stateId, 'done-id');
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'Done' } } } } });
    }) as typeof fetch;
    try {
      const response = await POST(request('accept'), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(response.status, 200);
      const result = await response.json() as { success: boolean; state: string };
      assert.equal(result.success, true);
      assert.equal(result.state, 'Done');
      assert.equal(operations.length, 3);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('does not mutate an issue outside configured cycle', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      operations.push(String(init?.body));
      return Response.json({ data: { issue: issue(null) } });
    }) as typeof fetch;
    try {
      const response = await POST(request('accept'), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(response.status, 404);
      assert.equal(operations.length, 1);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('rejects unsigned requests before touching Linear', async () => {
    const unsigned = new NextRequest('https://linear.gratis/api/public-view/demo/showcase-review', {
      method: 'POST', body: '{}',
    });
    const response = await POST(unsigned, { params: Promise.resolve({ slug: 'demo' }) });
    assert.equal(response.status, 401);
  });
});

async function postReview(body: Record<string, unknown> = {}, slug = 'demo', secret = 'test-secret') {
  const raw = JSON.stringify({ issueId: 'DEMO-69', action: 'accept', comment: '', reviewer: { name: 'Alex' }, submittedAt: new Date().toISOString(), ...body });
  return POST(new NextRequest(`https://example.test/api/public-view/${slug}/showcase-review`, {
    method: 'POST', body: raw, headers: { 'x-feedback-signature': createWebhookSignature(raw, secret) },
  }), { params: Promise.resolve({ slug }) });
}

describe('review boundaries and configurable workflows', () => {
  test('rejects missing policy, unknown views, disabled reviews, bad JSON, stale requests and oversize bodies before Linear access', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('Unexpected Linear call'); }) as typeof fetch;
    try {
      delete process.env.REVIEW_INTEGRATIONS_JSON;
      assert.equal((await postReview()).status, 503);
      process.env.REVIEW_INTEGRATIONS_JSON = saved;
      assert.equal((await postReview({}, 'unknown')).status, 404);
      process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ demo: { ...integrationConfig.demo, review: undefined } });
      assert.equal((await postReview()).status, 404);
      process.env.REVIEW_INTEGRATIONS_JSON = saved;
      assert.equal((await postReview({ submittedAt: '2000-01-01T00:00:00.000Z' })).status, 400);
      assert.equal((await postReview({ action: 'reject' })).status, 400);
      assert.equal((await postReview({ comment: 'x'.repeat(8000) })).status, 413);
      const raw = '{';
      assert.equal((await POST(new NextRequest('https://example.test', { method: 'POST', body: raw,
        headers: { 'x-linear-gratis-signature': createWebhookSignature(raw, 'test-secret') } }), { params: Promise.resolve({ slug: 'demo' }) })).status, 400);
      assert.equal(calls, 0);
    } finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; globalThis.fetch = originalFetch; }
  });

  test('accepts a maximum-length Unicode comment allowed by the existing producer', async () => {
    const comment = 'あ'.repeat(5000);
    let savedComment = '';
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('query ShowcaseReviewIssue')) return Response.json({ data: { issue: issue() } });
      if (body.query.includes('Comment')) {
        savedComment = body.variables.input.body;
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'Done' } } } } });
    }) as typeof fetch;
    try {
      assert.equal((await postReview({ comment })).status, 200);
      assert.equal(savedComment, `**Showcase review: Accepted** by Alex.\n\n${comment}`);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('a producer signature cannot authorize another configured view', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ ...integrationConfig, other: { ...integrationConfig.demo, secretEnv: 'OTHER_REVIEW_SECRET' } });
    process.env.OTHER_REVIEW_SECRET = 'different-secret';
    try { assert.equal((await postReview({}, 'other')).status, 401); }
    finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; delete process.env.OTHER_REVIEW_SECRET; }
  });

  test('rejects unavailable views and connections before Linear access', async () => {
    const savedView = view;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('Unexpected Linear call'); }) as typeof fetch;
    try {
      for (const candidate of [null, { team_id: 'another-team', expires_at: null }, { team_id: TEAM_ID, expires_at: '2000-01-01T00:00:00.000Z' }]) {
        view = candidate;
        assert.equal((await postReview()).status, 404);
      }
      view = savedView;
      token = null;
      assert.equal((await postReview()).status, 503);
      assert.equal(calls, 0);
    } finally { view = savedView; token = 'test-token'; globalThis.fetch = originalFetch; }
  });

  test('preserves each decision’s comment and target state', async () => {
    const outcomes = [
      ['accept', 'Accepted', 'Done', 'done-id'],
      ['changes', 'Changes requested', 'In Progress', 'progress-id'],
      ['reject', 'Rejected', 'Canceled', 'cancelled-id'],
      ['no-longer-needed', 'No longer needed', 'Canceled', 'cancelled-id'],
    ];
    try {
      for (const [action, label, state, stateId] of outcomes) {
        const operations: string[] = [];
        globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
          const body = JSON.parse(String(init?.body));
          operations.push(body.query);
          if (body.query.includes('query ShowcaseReviewIssue')) return Response.json({ data: { issue: issue() } });
          if (body.query.includes('Comment')) {
            assert.equal(body.variables.input.body, `**Showcase review: ${label}** by Alex.\n\nDecision explanation.`);
            return Response.json({ data: { commentCreate: { success: true } } });
          }
          assert.equal(body.variables.stateId, stateId);
          return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: state } } } } });
        }) as typeof fetch;
        const response = await postReview({ action, comment: 'Decision explanation.' });
        assert.deepEqual(await response.json(), { success: true, state });
        assert.equal(operations.length, 3);
      }
    } finally { globalThis.fetch = originalFetch; }
  });

  test('checks live identity, state and release scope before writing, and records approved provenance', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    const current = issue();
    const release = { version: 'demo-release', commit: 'a'.repeat(40) };
    const rule = { id: current.id, identifier: current.identifier, release: { ...release, scope: 'Approved demo scope.', sourceItems: ['ITEM-1'] } };
    process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ demo: { ...integrationConfig.demo, review: { issues: [rule] } } });
    let live = { ...current, description: rule.release.scope };
    let writes = 0;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('query ShowcaseReviewIssue')) return Response.json({ data: { issue: live } });
      writes++;
      if (body.query.includes('Comment')) {
        assert.match(body.variables.input.body, /Approved demo scope.*\n\nRelease: a{40} \(demo-release\); source items: ITEM-1/);
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'Done' } } } } });
    }) as typeof fetch;
    try {
      assert.equal((await postReview()).status, 409);
      assert.equal((await postReview({ release: { ...release, commit: 'b'.repeat(40) } })).status, 409);
      live = { ...live, description: 'Changed scope.' };
      assert.equal((await postReview({ release })).status, 409);
      live = { ...live, description: rule.release.scope, state: { name: 'Done' } };
      assert.equal((await postReview({ release })).status, 409);
      live = { ...live, state: { name: 'In Review' }, identifier: 'DEMO-999' };
      assert.equal((await postReview({ release })).status, 404);
      assert.equal(writes, 0);
      live = { ...live, identifier: current.identifier };
      assert.equal((await postReview({ release })).status, 200);
      assert.equal(writes, 2);
    } finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; globalThis.fetch = originalFetch; }
  });

  test('uses configured workflow names and reports partial or failed Linear writes', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ demo: { ...integrationConfig.demo, review: { fromState: 'Approval', transitions: { accept: 'Shipped' } } } });
    let mode = 'ok';
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (mode === 'network') throw new Error('Unavailable');
      if (mode === 'http') return new Response(null, { status: 503 });
      if (mode === 'graphql') return Response.json({ errors: [{ message: 'Not available' }] });
      if (mode === 'empty') return Response.json({});
      if (body.query.includes('query ShowcaseReviewIssue')) return Response.json({ data: { issue: { ...issue(), state: { name: 'Approval' }, team: { id: TEAM_ID, states: { nodes: mode === 'missing-state' ? [] : [{ id: 'shipped-id', name: 'Shipped' }] } } } } });
      if (body.query.includes('Comment')) return Response.json({ data: { commentCreate: { success: mode !== 'comment-failed' } } });
      assert.equal(body.variables.stateId, 'shipped-id');
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: mode === 'partial' ? 'Approval' : 'Shipped' } } } } });
    }) as typeof fetch;
    try {
      const response = await postReview();
      assert.deepEqual(await response.json(), { success: true, state: 'Shipped' });
      for (const scenario of ['network', 'http', 'graphql', 'empty', 'missing-state', 'comment-failed', 'partial']) {
        mode = scenario;
        const result = await postReview();
        assert.equal(result.status, scenario === 'missing-state' ? 503 : 502);
        if (scenario === 'partial') assert.match(JSON.stringify(await result.json()), /comment was saved/);
      }
    } finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; globalThis.fetch = originalFetch; }
  });
});
