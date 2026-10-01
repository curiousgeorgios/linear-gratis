import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NextRequest } from 'next/server';
import { createWebhookSignature } from '../src/lib/webhook-signature';
import { clientQuestions } from '../src/lib/showcase-client-questions';
import { CYCLE_ID, ASSIGNEE_ID, TEAM_ID, integrationConfig } from './helpers/review-integration';

const view = { team_id: TEAM_ID, expires_at: null };
const { mock } = require('bun:test') as { mock: { module: (path: string, factory: () => Record<string, unknown>) => void } };
const query = { select: () => query, eq: () => query, single: async () => ({ data: view }) };
mock.module('@/lib/supabase', () => ({ supabaseAdmin: { from: () => query } }));
mock.module('@/lib/public-view-issue-creation', () => ({ resolveLinearTokenForPublicView: async () => 'test-token' }));

const { POST } = await import('../src/app/api/public-view/[slug]/showcase-answer/route');
const originalFetch = globalThis.fetch;
delete process.env.REVIEW_INTEGRATIONS_GZIP_BASE64;
process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify(integrationConfig);
process.env.DEMO_REVIEW_SECRET = 'test-secret';

const description = '## Questions for client\n\n1. Who approves this?\n2. When is it due?\n\n## Scope\n- Not a question';
const answers = [
  { question: 'Who approves this?', answer: 'Project lead.' },
  { question: 'When is it due?', answer: 'Next Friday.' },
];

function request(body: Record<string, unknown>, signed = true) {
  const raw = JSON.stringify({ issueId: 'DEMO-235', answers, respondent: { name: 'Alex', email: 'alex@example.test' }, submittedAt: new Date().toISOString(), ...body });
  return new NextRequest('https://linear.gratis/api/public-view/demo/showcase-answer', {
    method: 'POST', body: raw,
    headers: signed ? { 'x-linear-gratis-signature': createWebhookSignature(raw, 'test-secret') } : {},
  });
}

function issue(overrides: Record<string, unknown> = {}) {
  return {
    id: '55555555-5555-4555-8555-555555555555', identifier: 'DEMO-235', description,
    team: { id: TEAM_ID, states: { nodes: [{ id: 'progress-id', name: 'In Progress' }] } },
    cycle: { id: CYCLE_ID }, assignee: { id: ASSIGNEE_ID }, state: { name: 'With client' }, ...overrides,
  };
}

describe('signed showcase client answers', () => {
  test('extracts explicit questions and the existing remaining-question format', () => {
    assert.deepEqual(clientQuestions(description), ['Who approves this?', 'When is it due?']);
    assert.deepEqual(clientQuestions('## Stakeholder questions\n\n1. Who approves this?', 'Stakeholder questions'), ['Who approves this?']);
    assert.deepEqual(clientQuestions('**Remaining question:** Do we need this?\n\n**Dependencies:** None.'), ['Do we need this?']);
  });

  test('adds an attributed comment and returns the issue to In Progress', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
      operations.push(body.query);
      if (body.query.includes('query ShowcaseAnswerIssue')) return Response.json({ data: { issue: issue() } });
      if (body.query.includes('mutation ShowcaseAnswerComment')) {
        assert.match(JSON.stringify(body.variables), /Client answers.*Alex.*Who approves this.*Project lead/);
        assert.doesNotMatch(JSON.stringify(body.variables), /alex@example\.test/);
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      assert.equal(body.variables.stateId, 'progress-id');
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'In Progress' } } } } });
    }) as typeof fetch;
    try {
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(response.status, 200);
      assert.deepEqual(await response.json(), { success: true, state: 'In Progress' });
      assert.equal(operations.length, 3);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('rejects stale questions without a Linear write', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      operations.push(String(init?.body));
      return Response.json({ data: { issue: issue({ description: '## Questions for client\n\n1. A new question?' }) } });
    }) as typeof fetch;
    try {
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(response.status, 409);
      assert.equal(operations.length, 1);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('rejects issues no longer waiting for the client', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      operations.push(String(init?.body));
      return Response.json({ data: { issue: issue({ state: { name: 'Done' } }) } });
    }) as typeof fetch;
    try {
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(response.status, 409);
      assert.equal(operations.length, 1);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('requires the signed integration and configured cycle membership', async () => {
    assert.equal((await POST(request({}, false), { params: Promise.resolve({ slug: 'demo' }) })).status, 401);
    globalThis.fetch = (async () => Response.json({ data: { issue: issue({ cycle: null }) } })) as typeof fetch;
    try {
      assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, 404);
    } finally { globalThis.fetch = originalFetch; }
  });
});
