import { z } from 'zod';
import { Buffer } from 'node:buffer';
import { gunzipSync } from 'node:zlib';

export const reviewActions = ['accept', 'changes', 'reject', 'no-longer-needed'] as const;
export type ShowcaseReviewAction = typeof reviewActions[number];
const stateName = z.string().trim().min(1).max(100);
const releaseSchema = z.object({
  version: z.string().min(1).max(100),
  commit: z.string().regex(/^[a-f0-9]{40}$/),
  scope: z.string().trim().min(1).max(5000),
  sourceItems: z.array(z.string().min(1).max(100)).max(100).default([]),
}).strict();

export const reviewIntegrationSchema = z.object({
  secretEnv: z.string().regex(/^[A-Z][A-Z0-9_]*$/),
  teamId: z.string().uuid(),
  cycleId: z.string().uuid().optional(),
  assigneeIds: z.array(z.string().uuid()).min(1).max(100),
  review: z.object({
    fromState: stateName.default('In Review'),
    transitions: z.object({
      accept: stateName.default('Done'),
      changes: stateName.default('In Progress'),
      reject: stateName.default('Canceled'),
      'no-longer-needed': stateName.default('Canceled'),
    }).strict().default({ accept: 'Done', changes: 'In Progress', reject: 'Canceled', 'no-longer-needed': 'Canceled' }),
    issues: z.array(z.object({
      id: z.string().uuid(),
      identifier: z.string().regex(/^[A-Z][A-Z0-9]*-\d+$/),
      assigneeIds: z.array(z.string().uuid()).min(1).max(100).optional(),
      release: releaseSchema,
    }).strict()).max(1000).default([]),
  }).strict().optional(),
  answers: z.object({
    fromState: stateName.default('With client'),
    toState: stateName.default('In Progress'),
    questionHeading: z.string().trim().min(1).max(200).default('Questions for client'),
  }).strict().optional(),
}).strict().superRefine((policy, ctx) => {
  const issues = policy.review?.issues ?? [];
  if (new Set(issues.map(issue => issue.id)).size !== issues.length ||
      new Set(issues.map(issue => issue.identifier)).size !== issues.length) {
    ctx.addIssue({ code: 'custom', message: 'Review issue identities must be unique.' });
  }
});
export type ReviewIntegration = z.infer<typeof reviewIntegrationSchema>;
export type ReviewIssue = {
  id: string; identifier: string; description?: string | null;
  team: { id: string }; cycle: { id: string } | null;
  assignee: { id: string } | null; state: { name: string };
};

export function resolveReviewIntegration(slug: string, env: Record<string, string | undefined> = process.env):
  | { status: 'ready'; policy: ReviewIntegration; secret: string }
  | { status: 'missing' | 'unavailable' } {
  if (env.REVIEW_INTEGRATIONS_JSON && env.REVIEW_INTEGRATIONS_GZIP_BASE64) return { status: 'unavailable' };
  if (!env.REVIEW_INTEGRATIONS_JSON && !env.REVIEW_INTEGRATIONS_GZIP_BASE64) return { status: 'unavailable' };
  let decoded: unknown;
  try {
    const raw = env.REVIEW_INTEGRATIONS_JSON ?? gunzipSync(
      Buffer.from(env.REVIEW_INTEGRATIONS_GZIP_BASE64 ?? '', 'base64'),
      { maxOutputLength: 1024 * 1024 },
    ).toString('utf8');
    decoded = JSON.parse(raw);
  } catch { return { status: 'unavailable' }; }
  const policies = z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), reviewIntegrationSchema).safeParse(decoded);
  if (!policies.success) return { status: 'unavailable' };
  const policy = Object.hasOwn(policies.data, slug) ? policies.data[slug] : undefined;
  if (!policy) return { status: 'missing' };
  const secret = env[policy.secretEnv];
  return secret?.trim() ? { status: 'ready', policy, secret } : { status: 'unavailable' };
}

export function configuredReviewIssue(issue: ReviewIssue, policy: ReviewIntegration) {
  return policy.review?.issues.find(rule => rule.identifier === issue.identifier || rule.id === issue.id);
}

export function isEligibleReviewIssue(issue: ReviewIssue, policy: ReviewIntegration, operation: 'review' | 'answers'): boolean {
  if (issue.team.id !== policy.teamId || (policy.cycleId && issue.cycle?.id !== policy.cycleId)) return false;
  const rule = operation === 'review' ? configuredReviewIssue(issue, policy) : undefined;
  if (rule && (rule.id !== issue.id || rule.identifier !== issue.identifier)) return false;
  return Boolean(issue.assignee && (rule?.assigneeIds ?? policy.assigneeIds).includes(issue.assignee.id));
}

export function hasCurrentReviewScope(issue: ReviewIssue, policy: ReviewIntegration, release?: { version: string; commit: string }): boolean {
  const rule = configuredReviewIssue(issue, policy);
  return !rule || (rule.id === issue.id && rule.identifier === issue.identifier &&
    release?.version === rule.release.version && release.commit === rule.release.commit &&
    Boolean(issue.description?.includes(rule.release.scope)));
}
