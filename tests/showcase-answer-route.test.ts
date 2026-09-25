import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NextRequest } from 'next/server';
import { createWebhookSignature } from '../src/lib/webhook-signature';
import { clientQuestions } from '../src/lib/showcase-client-questions';
import { CYCLE_29_ID, GEORGE_LINEAR_USER_ID, USUAL_SUSPECTS_TEAM_ID } from '../src/lib/showcase-review-policy';

const view = { team_id: USUAL_SUSPECTS_TEAM_ID, expires_at: null };
const { mock } = require('bun:test') as { mock: { module: (path: string, factory: () => Record<string, unknown>) => void } };
const query = { select: () => query, eq: () => query, single: async () => ({ data: view }) };
mock.module('@/lib/supabase', () => ({ supabaseAdmin: { from: () => query } }));
mock.module('@/lib/public-view-issue-creation', () => ({ resolveLinearTokenForPublicView: async () => 'test-token' }));

const { POST } = await import('../src/app/api/public-view/[slug]/showcase-answer/route');
const originalFetch = globalThis.fetch;
process.env.FEEDBACK_WEBHOOK_SECRET = 'test-secret';

const description = '## Questions for client\n\n1. Who approves this?\n2. When is it due?\n\n## Scope\n- Not a question';
const answers = [
  { question: 'Who approves this?', answer: 'Lauren.' },
  { question: 'When is it due?', answer: 'Next Friday.' },
];

function request(body: Record<string, unknown>, signed = true) {
  const raw = JSON.stringify({ issueId: 'USU-235', answers, respondent: { name: 'Shane', email: 'shane@example.test' }, submittedAt: new Date().toISOString(), ...body });
  return new NextRequest('https://linear.gratis/api/public-view/usual-suspects/showcase-answer', {
    method: 'POST', body: raw,
    headers: signed ? { 'x-linear-gratis-signature': createWebhookSignature(raw, 'test-secret') } : {},
  });
}

function issue(overrides: Record<string, unknown> = {}) {
  return {
    id: 'cfb65852-69d5-4833-96c3-4e8a0efae04b', identifier: 'USU-235', description,
    team: { id: USUAL_SUSPECTS_TEAM_ID, states: { nodes: [{ id: 'progress-id', name: 'In Progress' }] } },
    cycle: { id: CYCLE_29_ID }, assignee: { id: GEORGE_LINEAR_USER_ID }, state: { name: 'With client' }, ...overrides,
  };
}

describe('signed showcase client answers', () => {
  test('extracts explicit questions and the existing remaining-question format', () => {
    assert.deepEqual(clientQuestions(description), ['Who approves this?', 'When is it due?']);
    assert.deepEqual(clientQuestions('**Remaining question:** Do we need this?\n\n**Dependencies:** None.'), ['Do we need this?']);
  });

  test('adds an attributed comment and returns the issue to In Progress', async () => {
    const operations: string[] = [];
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as { query: string; variables: Record<string, unknown> };
      operations.push(body.query);
      if (body.query.includes('query ShowcaseAnswerIssue')) return Response.json({ data: { issue: issue() } });
      if (body.query.includes('mutation ShowcaseAnswerComment')) {
        assert.match(JSON.stringify(body.variables), /Client answers.*Shane.*Who approves this.*Lauren/);
        assert.doesNotMatch(JSON.stringify(body.variables), /shane@example\.test/);
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      assert.equal(body.variables.stateId, 'progress-id');
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'In Progress' } } } } });
    }) as typeof fetch;
    try {
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'usual-suspects' }) });
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
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'usual-suspects' }) });
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
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'usual-suspects' }) });
      assert.equal(response.status, 409);
      assert.equal(operations.length, 1);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('requires the signed integration and Cycle 29 membership', async () => {
    assert.equal((await POST(request({}, false), { params: Promise.resolve({ slug: 'usual-suspects' }) })).status, 401);
    globalThis.fetch = (async () => Response.json({ data: { issue: issue({ cycle: null }) } })) as typeof fetch;
    try {
      assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'usual-suspects' }) })).status, 404);
    } finally { globalThis.fetch = originalFetch; }
  });
});
