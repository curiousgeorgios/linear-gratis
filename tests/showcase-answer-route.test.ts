import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { NextRequest } from 'next/server';
import { createWebhookSignature } from '../src/lib/webhook-signature';
import { clientQuestions } from '../src/lib/showcase-client-questions';
import { CYCLE_ID, ASSIGNEE_ID, TEAM_ID, integrationConfig } from './helpers/review-integration';

let view: { team_id: string; expires_at: string | null } | null = { team_id: TEAM_ID, expires_at: null };
let token: string | null = 'test-token';
const { mock } = require('bun:test') as { mock: { module: (path: string, factory: () => Record<string, unknown>) => void } };
const query = { select: () => query, eq: () => query, single: async () => ({ data: view }) };
mock.module('@/lib/supabase', () => ({ supabaseAdmin: { from: () => query } }));
mock.module('@/lib/public-view-issue-creation', () => ({ resolveLinearTokenForPublicView: async () => token }));

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

  test('accepts the existing maximum question and Unicode answer sizes', async () => {
    const largeAnswers = Array.from({ length: 10 }, (_, index) => ({ question: `${'問'.repeat(996)}${index}?`, answer: 'あ'.repeat(5000) }));
    const currentDescription = `## Questions for client\n\n${largeAnswers.map(({ question }, index) => `${index + 1}. ${question}`).join('\n')}`;
    let savedComment = '';
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (body.query.includes('query ShowcaseAnswerIssue')) return Response.json({ data: { issue: issue({ description: currentDescription }) } });
      if (body.query.includes('Comment')) {
        savedComment = body.variables.input.body;
        return Response.json({ data: { commentCreate: { success: true } } });
      }
      return Response.json({ data: { issueUpdate: { success: true, issue: { state: { name: 'In Progress' } } } } });
    }) as typeof fetch;
    try {
      assert.equal((await POST(request({ answers: largeAnswers }), { params: Promise.resolve({ slug: 'demo' }) })).status, 200);
      for (const { question, answer } of largeAnswers) assert.ok(savedComment.includes(`${question}**\n\n${answer}`));
    } finally { globalThis.fetch = originalFetch; }
  });

  test('rejects invalid configuration and payloads before Linear access', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('Unexpected Linear call'); }) as typeof fetch;
    const post = (body = {}, slug = 'demo') => POST(request(body), { params: Promise.resolve({ slug }) });
    try {
      delete process.env.REVIEW_INTEGRATIONS_JSON;
      assert.equal((await post()).status, 503);
      process.env.REVIEW_INTEGRATIONS_JSON = saved;
      assert.equal((await post({}, 'unknown')).status, 404);
      process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ demo: { ...integrationConfig.demo, answers: undefined } });
      assert.equal((await post()).status, 404);
      process.env.REVIEW_INTEGRATIONS_JSON = saved;
      for (const body of [{ submittedAt: '2000-01-01T00:00:00.000Z' }, { answers: [] }, { answers: [{ question: 'Q?', answer: ' ' }] }]) {
        assert.equal((await post(body)).status, 400);
      }
      assert.equal((await post({ answers: [{ question: 'Q?', answer: 'x'.repeat(66_000) }] })).status, 413);
      const raw = '{';
      assert.equal((await POST(new NextRequest('https://example.test', { method: 'POST', body: raw,
        headers: { 'x-feedback-signature': createWebhookSignature(raw, 'test-secret') } }), { params: Promise.resolve({ slug: 'demo' }) })).status, 400);
      assert.equal(calls, 0);
    } finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; globalThis.fetch = originalFetch; }
  });

  test('rejects missing, expired or mismatched views and unavailable connections before Linear access', async () => {
    const savedView = view;
    let calls = 0;
    globalThis.fetch = (async () => { calls++; throw new Error('Unexpected Linear call'); }) as typeof fetch;
    try {
      for (const candidate of [null, { team_id: 'another-team', expires_at: null }, { team_id: TEAM_ID, expires_at: '2000-01-01T00:00:00.000Z' }]) {
        view = candidate;
        assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, 404);
      }
      view = savedView;
      token = null;
      assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, 503);
      assert.equal(calls, 0);
    } finally { view = savedView; token = 'test-token'; globalThis.fetch = originalFetch; }
  });

  test('does not write for a mismatched issue identity, team, owner or question order', async () => {
    let current = issue();
    let writes = 0;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (!body.query.includes('query ShowcaseAnswerIssue')) writes++;
      return Response.json({ data: { issue: current } });
    }) as typeof fetch;
    try {
      for (const overrides of [{ identifier: 'DEMO-999' }, { team: { id: 'another-team' } }, { assignee: null }, { assignee: { id: 'another-owner' } }]) {
        current = issue(overrides);
        assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, 404);
      }
      current = issue();
      for (const supplied of [answers.slice(0, 1), [...answers].reverse()]) {
        assert.equal((await POST(request({ answers: supplied }), { params: Promise.resolve({ slug: 'demo' }) })).status, 409);
      }
      current = issue({ description: null });
      assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, 409);
      assert.equal(writes, 0);
    } finally { globalThis.fetch = originalFetch; }
  });

  test('supports a configured answer workflow and reports failed or partial writes', async () => {
    const saved = process.env.REVIEW_INTEGRATIONS_JSON;
    process.env.REVIEW_INTEGRATIONS_JSON = JSON.stringify({ demo: { ...integrationConfig.demo,
      answers: { fromState: 'Waiting', toState: 'Working', questionHeading: 'Stakeholder questions' } } });
    let mode = 'ok';
    let updates = 0;
    globalThis.fetch = (async (_url: RequestInfo | URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body));
      if (mode === 'network') throw new Error('Unavailable');
      if (body.query.includes('query ShowcaseAnswerIssue')) return Response.json({ data: { issue: issue({ state: { name: 'Waiting' },
        description: '## Stakeholder questions\n\n1. Who approves this?\n2. When is it due?',
        team: { id: TEAM_ID, states: { nodes: mode === 'missing-state' ? [] : [{ id: 'working-id', name: 'Working' }] } },
      }) } });
      if (body.query.includes('Comment')) return Response.json({ data: { commentCreate: { success: mode !== 'comment-failed' } } });
      updates++;
      assert.equal(body.variables.stateId, 'working-id');
      return Response.json({ data: { issueUpdate: { success: mode !== 'partial', issue: { state: { name: mode === 'partial' ? 'Waiting' : 'Working' } } } } });
    }) as typeof fetch;
    try {
      const response = await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) });
      assert.deepEqual(await response.json(), { success: true, state: 'Working' });
      updates = 0;
      for (const scenario of ['missing-state', 'comment-failed', 'network']) {
        mode = scenario;
        assert.equal((await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) })).status, scenario === 'missing-state' ? 503 : 502);
        assert.equal(updates, 0);
      }
      mode = 'partial';
      const partial = await POST(request({}), { params: Promise.resolve({ slug: 'demo' }) });
      assert.equal(partial.status, 502);
      assert.match(JSON.stringify(await partial.json()), /Answers were saved/);
      assert.equal(updates, 1);
    } finally { process.env.REVIEW_INTEGRATIONS_JSON = saved; globalThis.fetch = originalFetch; }
  });
});
