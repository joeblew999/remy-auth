import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { jobParts } from '../../packages/ui/src/cli/ci';

// ci is the one source of what GitHub runs (owner, 2026-10-17): each job is `npm run ci -- <part>`, and
// the workflow's job list is held to the parts and shards ci defines, so the two cannot drift apart.

test("the workflow runs exactly ci's jobs, one npm run ci line each", () => {
  const workflow = readFileSync('.github/workflows/google.yml', 'utf8');
  expect(workflow).toContain('npm run ci -- ${{ matrix.part }}');
  const listed = [...workflow.matchAll(/^\s+part: (.+)$/gm)].map(match => match[1]!.trim());
  expect([...listed].sort(), `google.yml runs ${listed.join(', ')}; ci expects ${jobParts().join(', ')}`).toEqual([...jobParts()].sort());
});
