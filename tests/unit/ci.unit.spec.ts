import { test, expect } from 'vite-plus/test';
import { readFileSync } from 'node:fs';
// `vp run ci` (the root script) is the one source of what GitHub runs (owner, 2026-10-17): each of its parts is one
// of GitHub's jobs, `vp run <part>`, the browser checks in three shards, so the two cannot drift apart.

test('the workflow runs exactly the parts of vp run ci, one vp run line each', () => {
  const workflow = readFileSync('.github/workflows/ci.yml', 'utf8');
  expect(workflow).toContain('run: vp run ${{ matrix.task }}');
  const listed = [...workflow.matchAll(/^\s+task: (.+)$/gm)].map((match) => match[1]!.trim());
  const { scripts } = JSON.parse(readFileSync('package.json', 'utf8')) as { scripts: Record<string, string> };
  const jobs = scripts.ci!.split(' && ').flatMap((part) => {
    const task = part.replace(/^vp run /, '');
    return task === 'test:browser' ? [1, 2, 3].map((shard) => `${task} --shard ${shard}/3`) : [task];
  });
  expect([...listed].sort(), `ci.yml runs ${listed.join(', ')}; the tasks name ${jobs.join(', ')}`).toEqual(
    [...jobs].sort(),
  );
});

test('a check that passed only on its retry is named, with its file and line', async () => {
  const { flakyIn } = await import('../../packages/remy-cli/src/test');
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
