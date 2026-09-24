export const CYCLE_29_ID = '7363570b-2655-409a-8c49-51ecf2c4f83e';
export const GEORGE_LINEAR_USER_ID = 'c78169af-00e6-4bdf-aea9-20567ef13a9f';
export const USUAL_SUSPECTS_TEAM_ID = '0f8afe8c-b8aa-4bf6-b165-d91c3ebd1c1d';

export type ShowcaseReviewAction = 'accept' | 'changes' | 'reject' | 'no-longer-needed';

export function nextReviewState(action: ShowcaseReviewAction): 'Done' | 'In Progress' | 'Canceled' {
  if (action === 'accept') return 'Done';
  if (action === 'changes') return 'In Progress';
  return 'Canceled';
}

export function isReviewableCycle29Issue(issue: {
  team: { id: string };
  cycle: { id: string } | null;
  assignee: { id: string } | null;
  state: { name: string };
}): boolean {
  return issue.team.id === USUAL_SUSPECTS_TEAM_ID &&
    issue.cycle?.id === CYCLE_29_ID &&
    issue.assignee?.id === GEORGE_LINEAR_USER_ID &&
    issue.state.name === 'In Review';
}
