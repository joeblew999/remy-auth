import { test, expect } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
import { githubJobs } from '../../packages/ui/src/tasks.js';

// The tasks are the one source of what GitHub runs (owner, 2026-10-17): each job is `vp run <task>`, and the
// workflow's job list is held to githubJobs (packages/ui/src/tasks.js), plus remy-auth's new-app, so the two cannot
// drift apart.

test('the workflow runs exactly the jobs the tasks name, one vp run line each', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  expect(workflow).toContain('run: vp run ${{ matrix.task }}');
  const listed = [...workflow.matchAll(/^\s+task: (.+)$/gm)].map((match) => match[1]!.trim());
  const jobs = [...githubJobs(), 'new-app'];
  expect([...listed].sort(), `ci.yml runs ${listed.join(', ')}; the tasks name ${jobs.join(', ')}`).toEqual(
    [...jobs].sort(),
  );
});

test('a check that passed only on its retry is named, with its file and line', async () => {
  const { flakyIn } = await import('../../packages/ui/src/cli/test');
  const report = {
    suites: [
      {
        suites: [
          {
            specs: [
              {
                file: 'tests/auth.spec.ts',
                line: 164,
                title: 'a fourth code request is refused',
                tests: [{ status: 'flaky' }],
              },
              { file: 'tests/gui.spec.ts', line: 12, title: 'the home page hydrates', tests: [{ status: 'expected' }] },
            ],
          },
        ],
      },
    ],
  };
  expect(flakyIn(report)).toEqual(['tests/auth.spec.ts:164 a fourth code request is refused']);
  expect(flakyIn({})).toEqual([]);
});
