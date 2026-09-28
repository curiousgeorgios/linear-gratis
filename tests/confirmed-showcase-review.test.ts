import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BEN_LINEAR_USER_ID, CONFIRMED_REVIEW_COMMIT, CONFIRMED_REVIEW_VERSION, confirmedReviewIssues, hasCurrentConfirmedReview } from '../src/lib/confirmed-showcase-review';
import { CYCLE_29_ID, USUAL_SUSPECTS_TEAM_ID, isReviewableCycle29Issue } from '../src/lib/showcase-review-policy';

describe('confirmed release review boundary', () => {
  const selected = confirmedReviewIssues[0];
  const issue = { ...selected, description: selected.scope, team: { id: USUAL_SUSPECTS_TEAM_ID }, cycle: { id: CYCLE_29_ID }, assignee: { id: BEN_LINEAR_USER_ID }, state: { name: 'In Review' } };
  const release = { version: CONFIRMED_REVIEW_VERSION, commit: CONFIRMED_REVIEW_COMMIT };
  test('allows only the exact confirmed issue identity for Ben', () => {
    assert.equal(isReviewableCycle29Issue(issue), true);
    assert.equal(isReviewableCycle29Issue({ ...issue, identifier: 'USU-999' }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, id: 'different-uuid' }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, state: { name: 'Todo' } }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, cycle: null }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, team: { id: 'other' } }), false);
  });
  test('requires the approved release and current scope text', () => {
    assert.equal(hasCurrentConfirmedReview(issue, release), true);
    assert.equal(hasCurrentConfirmedReview(issue), false);
    assert.equal(hasCurrentConfirmedReview(issue, { ...release, commit: '0'.repeat(40) }), false);
    assert.equal(hasCurrentConfirmedReview(issue, { ...release, version: 'old' }), false);
    assert.equal(hasCurrentConfirmedReview({ ...issue, description: 'Earlier scope' }, release), false);
  });
  test('rejects outdated source/archive and expanded-section scope', () => {
    for (const identifier of ['USU-201', 'USU-269']) {
      const scoped = confirmedReviewIssues.find(entry => entry.identifier === identifier)!;
      assert.equal(hasCurrentConfirmedReview({ ...scoped, description: 'Remove archive or start expanded' }, release), false);
      assert.equal(hasCurrentConfirmedReview({ ...scoped, description: scoped.scope }, release), true);
    }
  });
  test('preserves the original George review path for other issues', () => {
    assert.equal(hasCurrentConfirmedReview({ identifier: 'USU-69', id: 'original' }), true);
  });
});
