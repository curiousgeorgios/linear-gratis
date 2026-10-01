import { readFile } from 'node:fs/promises';
import { z } from 'zod';
import { reviewIntegrationSchema } from '../src/lib/showcase-review-policy';

const file = process.argv[2];
if (!file) throw new Error('Usage: bun scripts/validate-review-config.ts <policy.json>');
const decoded: unknown = JSON.parse(await readFile(file, 'utf8'));
const result = z.record(z.string().regex(/^[a-z0-9][a-z0-9-]*$/), reviewIntegrationSchema).safeParse(decoded);
if (!result.success) {
  console.error('Invalid review configuration:', result.error.issues.map(issue => ({ path: issue.path, message: issue.message })));
  process.exit(1);
}
console.log(`Valid review configuration: ${Object.keys(result.data).length} integration(s).`);
