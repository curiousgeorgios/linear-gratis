import { describe, test } from 'node:test';
import assert from 'node:assert/strict';
import { BEN_LINEAR_USER_ID, CONFIRMED_REVIEW_COMMIT, CONFIRMED_REVIEW_VERSION, confirmedReviewIssue, confirmedReviewIssues, hasCurrentConfirmedReview } from '../src/lib/confirmed-showcase-review';
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
  test('pins the live follow-up release and rejects the superseded one', () => {
    assert.equal(CONFIRMED_REVIEW_VERSION, 'sprint-1-confirmed-followup-2026-09-29');
    assert.equal(CONFIRMED_REVIEW_COMMIT, 'a1ef4957cdae96077ade0fa33cf368cb938927f4');
    assert.equal(hasCurrentConfirmedReview(issue, { version: 'sprint-1-confirmed-followup-2026-09-29', commit: 'a1ef4957cdae96077ade0fa33cf368cb938927f4' }), true);
    assert.equal(hasCurrentConfirmedReview(issue, { version: 'sprint-1-confirmed-2026-09-28', commit: 'a1ef4957cdae96077ade0fa33cf368cb938927f4' }), false);
    assert.equal(hasCurrentConfirmedReview(issue, { version: 'sprint-1-confirmed-followup-2026-09-29', commit: '53b08d7ca2079788acf8547044b009162a95bff5' }), false);
    assert.equal(hasCurrentConfirmedReview(issue, { version: 'sprint-1-confirmed-2026-09-28', commit: '53b08d7ca2079788acf8547044b009162a95bff5' }), false);
  });
  const added = [
    { identifier: 'USU-115', id: '816e0cc3-b436-491b-b444-c02066bc0388', localIds: ['OT-04'] },
    { identifier: 'USU-98', id: '23d43a7e-c014-4833-ab66-10e19bbb7bc8', localIds: ['OT-12'] },
    { identifier: 'USU-263', id: '92d4d8e4-53d6-411d-aee7-5e2e970e05c7', localIds: ['OT-05'] },
  ];
  for (const expected of added) {
    test(`recognises ${expected.identifier} and requires its scope`, () => {
      const scoped = confirmedReviewIssue(expected.identifier, expected.id);
      assert.ok(scoped);
      assert.deepEqual(scoped.localIds, expected.localIds);
      assert.equal(confirmedReviewIssue(expected.identifier, 'different-uuid'), undefined);
      const candidate = { ...issue, identifier: expected.identifier, id: expected.id };
      assert.equal(isReviewableCycle29Issue(candidate), true);
      assert.equal(hasCurrentConfirmedReview({ ...candidate, description: scoped.scope }, release), true);
      assert.equal(hasCurrentConfirmedReview({ ...candidate, description: 'Earlier scope' }, release), false);
      assert.equal(hasCurrentConfirmedReview({ ...candidate, description: null }, release), false);
      assert.equal(hasCurrentConfirmedReview({ ...candidate, description: scoped.scope }), false);
    });
  }
  test('preserves the original George review path for other issues', () => {
    assert.equal(hasCurrentConfirmedReview({ identifier: 'USU-69', id: 'original' }), true);
  });
});
