import assert from 'node:assert/strict';
import { describe, test } from 'node:test';
import {
  CYCLE_29_ID, GEORGE_LINEAR_USER_ID, USUAL_SUSPECTS_TEAM_ID,
  isReviewableCycle29Issue, nextReviewState,
} from '../src/lib/showcase-review-policy';

describe('Cycle 29 showcase review policy', () => {
  test('maps decisions to the agreed Linear statuses', () => {
    assert.equal(nextReviewState('accept'), 'Done');
    assert.equal(nextReviewState('changes'), 'In Progress');
    assert.equal(nextReviewState('reject'), 'Canceled');
    assert.equal(nextReviewState('no-longer-needed'), 'Canceled');
  });

  test('only George-owned Cycle 29 issues in review are eligible', () => {
    const issue = {
      team: { id: USUAL_SUSPECTS_TEAM_ID },
      cycle: { id: CYCLE_29_ID },
      assignee: { id: GEORGE_LINEAR_USER_ID },
      state: { name: 'In Review' },
    };
    assert.equal(isReviewableCycle29Issue(issue), true);
    assert.equal(isReviewableCycle29Issue({ ...issue, cycle: null }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, assignee: null }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, state: { name: 'Done' } }), false);
    assert.equal(isReviewableCycle29Issue({ ...issue, team: { id: 'another-team' } }), false);
  });
});
