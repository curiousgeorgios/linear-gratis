#!/usr/bin/env node

import { readFile } from 'node:fs/promises'

const COVERAGE_FILE = new URL('../coverage/lcov.info', import.meta.url)
const EXPECTED_PRODUCTION_FILES = [
  'src/components/priority-icon.tsx',
  'src/components/state-icon.tsx',
  'src/components/ui/badge.tsx',
  'src/components/ui/button.tsx',
  'src/data/comparisons.ts',
  'src/data/integrations.ts',
  'src/data/templates.ts',
  'src/data/use-cases.ts',
  'src/lib/access-cookie.ts',
  'src/lib/attachment-markdown.ts',
  'src/lib/encryption-v2.ts',
  'src/lib/encryption.ts',
  'src/lib/form-attachment.ts',
  'src/lib/ip-hash.ts',
  'src/lib/issue-filters.ts',
  'src/lib/linear.ts',
  'src/lib/metadata.ts',
  'src/lib/public-redaction.ts',
  'src/lib/request-security-core.ts',
  'src/lib/roadmap-vote-lifecycle.ts',
  'src/lib/structured-data.tsx',
  'src/lib/supabase-errors.ts',
  'src/lib/utils.ts',
  'src/lib/webhook-signature.ts',
]

function percentage(covered, total) {
  return total === 0 ? 100 : (covered / total) * 100
}

function parseRecord(record) {
  const lines = record.split('\n')
  const file = lines.find((line) => line.startsWith('SF:'))?.slice(3)
  if (!file) return null

  const lineHits = lines
    .filter((line) => line.startsWith('DA:'))
    .map((line) => Number(line.split(',')[1]))
  const functionsFound = Number(lines.find((line) => line.startsWith('FNF:'))?.slice(4) ?? 0)
  const functionsHit = Number(lines.find((line) => line.startsWith('FNH:'))?.slice(4) ?? 0)

  return {
    file,
    linesFound: lineHits.length,
    linesHit: lineHits.filter((hits) => hits > 0).length,
    functionsFound,
    functionsHit,
  }
}

const source = await readFile(COVERAGE_FILE, 'utf8')
const records = source
  .split('end_of_record')
  .map(parseRecord)
  .filter(Boolean)
const byFile = new Map(records.map((record) => [record.file, record]))
const failures = []

for (const file of EXPECTED_PRODUCTION_FILES) {
  const record = byFile.get(file)
  if (!record) {
    failures.push(`${file} is missing from the coverage report`)
    continue
  }

  const lineCoverage = percentage(record.linesHit, record.linesFound)
  const functionCoverage = percentage(record.functionsHit, record.functionsFound)
  if (lineCoverage < 80) failures.push(`${file} line coverage ${lineCoverage.toFixed(2)}% is below 80%`)
  if (functionCoverage < 80) failures.push(`${file} function coverage ${functionCoverage.toFixed(2)}% is below 80%`)
}

const production = records.filter((record) => record.file.startsWith('src/'))
const totals = production.reduce((result, record) => ({
  linesFound: result.linesFound + record.linesFound,
  linesHit: result.linesHit + record.linesHit,
  functionsFound: result.functionsFound + record.functionsFound,
  functionsHit: result.functionsHit + record.functionsHit,
}), { linesFound: 0, linesHit: 0, functionsFound: 0, functionsHit: 0 })
const overallLines = percentage(totals.linesHit, totals.linesFound)
const overallFunctions = percentage(totals.functionsHit, totals.functionsFound)

if (overallLines < 95) failures.push(`overall loaded-source line coverage ${overallLines.toFixed(2)}% is below 95%`)
if (overallFunctions < 90) failures.push(`overall loaded-source function coverage ${overallFunctions.toFixed(2)}% is below 90%`)

console.log(`Coverage gate: ${EXPECTED_PRODUCTION_FILES.length} production modules, ${overallLines.toFixed(2)}% lines, ${overallFunctions.toFixed(2)}% functions`)

if (failures.length > 0) {
  for (const failure of failures) console.error(`- ${failure}`)
  process.exit(1)
}
