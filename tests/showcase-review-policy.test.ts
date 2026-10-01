import { gzipSync } from 'node:zlib';
import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import { reviewIntegrationSchema, resolveReviewIntegration, isEligibleReviewIssue, hasCurrentReviewScope, configuredReviewIssue } from '../src/lib/showcase-review-policy';
import { TEAM_ID, CYCLE_ID, ASSIGNEE_ID, integrationConfig } from './helpers/review-integration';

const base = integrationConfig.demo;
const otherAssignee = '66666666-6666-4666-8666-666666666666';
const issue = { id: '44444444-4444-4444-8444-444444444444', identifier: 'DEMO-42',
  team: { id: TEAM_ID }, cycle: { id: CYCLE_ID }, assignee: { id: ASSIGNEE_ID }, state: { name: 'In Review' },
  description: 'Approved scope: Show the project number.',
};
const release = { version: 'demo-release', commit: 'a'.repeat(40), scope: 'Show the project number.', sourceItems: ['ITEM-1'] };
const policy = reviewIntegrationSchema.parse({ ...base, review: { issues: [{ id: issue.id, identifier: issue.identifier, assigneeIds: [ASSIGNEE_ID, otherAssignee], release }] } });

describe('configurable review integration', () => {
  test('fails closed for missing, malformed or invalid configuration and missing secrets', () => {
    for (const raw of [undefined, '{', 'null', '{}', JSON.stringify({ demo: { ...base, teamId: 'bad-id' } })]) {
      const result = resolveReviewIntegration('demo', { REVIEW_INTEGRATIONS_JSON: raw });
      assert.equal(result.status, raw === '{}' ? 'missing' : 'unavailable');
    }
    assert.equal(resolveReviewIntegration('demo', { REVIEW_INTEGRATIONS_JSON: JSON.stringify(integrationConfig) }).status, 'unavailable');
    assert.equal(resolveReviewIntegration('demo', { REVIEW_INTEGRATIONS_JSON: JSON.stringify(integrationConfig), DEMO_REVIEW_SECRET: '  ' }).status, 'unavailable');
  });
  test('accepts compressed private policy and fails closed on ambiguous or corrupt input', () => {
    const raw = JSON.stringify(integrationConfig);
    const encoded = gzipSync(raw).toString('base64');
    const env = { REVIEW_INTEGRATIONS_GZIP_BASE64: encoded, DEMO_REVIEW_SECRET: 'secret' };
    assert.equal(resolveReviewIntegration('demo', env).status, 'ready');
    assert.equal(resolveReviewIntegration('demo', { ...env, REVIEW_INTEGRATIONS_JSON: raw }).status, 'unavailable');
    assert.equal(resolveReviewIntegration('demo', { ...env, REVIEW_INTEGRATIONS_GZIP_BASE64: 'bad-gzip' }).status, 'unavailable');
    assert.equal(resolveReviewIntegration('demo', { ...env, REVIEW_INTEGRATIONS_GZIP_BASE64: gzipSync('x'.repeat(1024 * 1024 + 1)).toString('base64') }).status, 'unavailable');
  });
  test('uses each view’s configured secret and rejects unknown or inherited slugs', () => {
    const env = { REVIEW_INTEGRATIONS_JSON: JSON.stringify({ ...integrationConfig, other: { ...base, secretEnv: 'OTHER_SECRET' } }), DEMO_REVIEW_SECRET: 'one', OTHER_SECRET: 'two' };
    assert.deepEqual(resolveReviewIntegration('demo', env), { status: 'ready', policy: reviewIntegrationSchema.parse(base), secret: 'one' });
    const other = resolveReviewIntegration('other', env);
    assert.equal(other.status === 'ready' && other.secret, 'two');
    for (const slug of ['missing', 'constructor', '__proto__']) assert.equal(resolveReviewIntegration(slug, env).status, 'missing');
  });
  test('validates unique exact issue identities', () => {
    const entry = policy.review?.issues[0];
    assert.equal(reviewIntegrationSchema.safeParse({ ...base, review: { issues: [entry, entry] } }).success, false);
    assert.equal(reviewIntegrationSchema.safeParse({ ...base, review: { issues: [entry, { ...entry, id: otherAssignee }] } }).success, false);
  });
  test('defaults and custom workflow names are supported', () => {
    assert.deepEqual(reviewIntegrationSchema.parse(base).review?.transitions, { accept: 'Done', changes: 'In Progress', reject: 'Canceled', 'no-longer-needed': 'Canceled' });
    const custom = reviewIntegrationSchema.parse({ ...base, review: { fromState: 'Approval', transitions: { accept: 'Shipped' } }, answers: { fromState: 'Waiting', toState: 'Working', questionHeading: 'Stakeholder questions' } });
    assert.equal(custom.review?.transitions.accept, 'Shipped');
    assert.equal(custom.answers?.toState, 'Working');
    assert.equal(reviewIntegrationSchema.parse({ ...base, review: undefined, answers: undefined }).review, undefined);
  });
  test('checks team, cycle, assignee and issue identity before allowing writes', () => {
    assert.equal(isEligibleReviewIssue(issue, policy, 'review'), true);
    assert.equal(isEligibleReviewIssue({ ...issue, assignee: { id: otherAssignee } }, policy, 'review'), true);
    assert.equal(isEligibleReviewIssue({ ...issue, assignee: { id: otherAssignee } }, policy, 'answers'), false);
    for (const overrides of [{ team: { id: otherAssignee } }, { cycle: null }, { assignee: null }, { assignee: { id: 'another-owner' } }, { id: otherAssignee }, { identifier: 'DEMO-99' }]) {
      assert.equal(isEligibleReviewIssue({ ...issue, ...overrides }, policy, 'review'), false);
    }
    assert.equal(isEligibleReviewIssue({ ...issue, id: otherAssignee, identifier: 'DEMO-99' }, policy, 'review'), true);
    assert.equal(isEligibleReviewIssue({ ...issue, cycle: null }, reviewIntegrationSchema.parse({ ...base, cycleId: undefined }), 'review'), true);
  });
  test('requires current release provenance and approved scope for configured issues', () => {
    assert.equal(hasCurrentReviewScope(issue, policy, release), true);
    for (const candidate of [undefined, { ...release, version: 'old' }, { ...release, commit: 'b'.repeat(40) }]) assert.equal(hasCurrentReviewScope(issue, policy, candidate), false);
    assert.equal(hasCurrentReviewScope({ ...issue, description: null }, policy, release), false);
    assert.equal(hasCurrentReviewScope({ ...issue, description: 'Changed scope.' }, policy, release), false);
    assert.equal(hasCurrentReviewScope({ ...issue, id: otherAssignee }, policy, release), false);
    const outside = { ...issue, id: otherAssignee, identifier: 'DEMO-99' };
    assert.equal(configuredReviewIssue(outside, policy), undefined);
    assert.equal(hasCurrentReviewScope(outside, policy), true);
  });
});
