export const CONFIRMED_REVIEW_VERSION = 'sprint-1-confirmed-followup-2026-09-29';
export const CONFIRMED_REVIEW_COMMIT = 'a1ef4957cdae96077ade0fa33cf368cb938927f4';
export const BEN_LINEAR_USER_ID = '53f41544-41d0-49cb-a695-51a47f1be226';
export const confirmedReviewIssues = [
  {
    "identifier": "USU-62",
    "id": "8b830b3a-7824-4674-a81a-2f80a00b4975",
    "scope": "Keep the invoice number separate from a short description. Enter a description during upload or bill editing and show it in Bills & Costs and reconciliation, with the full text available on hover.",
    "localIds": [
      "BC-01",
      "BC-02"
    ]
  },
  {
    "identifier": "USU-60",
    "id": "666fa4ca-8df5-4bd5-9662-a7dfc04772e5",
    "scope": "Show the uploader as the bill owner. Keep an expandable activity log of who edited the bill and the values they changed, including Notes to Accounting. Legacy bills without actor data show an unknown owner.",
    "localIds": [
      "BC-03"
    ]
  },
  {
    "identifier": "USU-232",
    "id": "db30656c-3718-4d1d-b12b-fe243d8fe7de",
    "scope": "Sort Bills & Costs by its data columns and search using invoice numbers or amounts, including formatted currency values.",
    "localIds": [
      "BC-04",
      "BC-05"
    ]
  },
  {
    "identifier": "USU-201",
    "id": "9e75c3e0-5652-484d-887b-f221b132d591",
    "scope": "Replace source text with compact icons and accessible source labels. This review covers source icons only; archive removal is deferred.",
    "localIds": [
      "BC-06"
    ]
  },
  {
    "identifier": "USU-269",
    "id": "d27704e4-5487-460f-b52d-358011ebe703",
    "scope": "Estimate sections start collapsed. Search estimate targets and unallocated costs independently. Preserve position and expansion during allocation refreshes; clear exhausted searches after a successful allocation.",
    "localIds": [
      "BP-01",
      "BP-13",
      "BP-14"
    ]
  },
  {
    "identifier": "USU-137",
    "id": "347bb3fd-3385-4ea9-98d2-c58d6ea261a3",
    "scope": "Exclude management fees and internal costs from reconciliation targets and related reconciliation budget totals. Retain those lines in estimates and budgets; keep ordinary external costs eligible.",
    "localIds": [
      "BP-02"
    ]
  },
  {
    "identifier": "USU-133",
    "id": "bb4a7e46-a524-41eb-9963-4c2189df9a22",
    "scope": "Use green for spend at or below the reconciliation budget and red for over-budget spend. A zero budget remains neutral.",
    "localIds": [
      "BP-03"
    ]
  },
  {
    "identifier": "USU-171",
    "id": "999ccfd6-14a6-4c7b-987b-5df1c1a16324",
    "scope": "Keep Previous and Next navigation centred in the bill header. Follow the active list order and preserve its search, filters and page when moving between bills or returning to the list.",
    "localIds": [
      "BP-08"
    ]
  },
  {
    "identifier": "USU-152",
    "id": "d76c27ba-ba9c-41de-b7ad-d0d38460bfd3",
    "scope": "Load the current bill category without fetching detailed reconciled rows until the Reconciled category is selected. Keep status counts available.",
    "localIds": [
      "BP-11"
    ]
  },
  {
    "identifier": "USU-271",
    "id": "f081267c-750d-46ff-8547-2495f2d9d7cf",
    "scope": "Show a collapsed row per project with read-only totals and expandable, editable estimate allocations. Preserve main's existing revenue calculations and stage rules.",
    "localIds": [
      "FC-04"
    ]
  },
  {
    "identifier": "USU-107",
    "id": "e9d1ff34-be1b-40a5-9ba2-12a9f8294984",
    "scope": "Make applicable list headers sortable with ascending and descending states and keyboard-accessible controls. Keep invoice and estimate document lines in their meaningful document order.",
    "localIds": [
      "OT-03"
    ]
  },
  {
    "identifier": "USU-115",
    "id": "816e0cc3-b436-491b-b444-c02066bc0388",
    "scope": "SCOPE_PENDING_APPROVAL_USU-115",
    "localIds": [
      "OT-04"
    ]
  },
  {
    "identifier": "USU-98",
    "id": "23d43a7e-c014-4833-ab66-10e19bbb7bc8",
    "scope": "SCOPE_PENDING_APPROVAL_USU-98",
    "localIds": [
      "OT-12"
    ]
  },
  {
    "identifier": "USU-263",
    "id": "92d4d8e4-53d6-411d-aee7-5e2e970e05c7",
    "scope": "SCOPE_PENDING_APPROVAL_USU-263",
    "localIds": [
      "OT-05"
    ]
  }
] as const;
export function confirmedReviewIssue(identifier: string, id: string) {
  return confirmedReviewIssues.find(issue => issue.identifier === identifier && issue.id === id);
}
export function hasCurrentConfirmedReview(issue: { identifier: string; id: string; description?: string | null }, release?: { version: string; commit: string }) {
  const confirmed = confirmedReviewIssue(issue.identifier, issue.id);
  return !confirmed || (release?.version === CONFIRMED_REVIEW_VERSION && release.commit === CONFIRMED_REVIEW_COMMIT && Boolean(issue.description?.includes(confirmed.scope)));
}
