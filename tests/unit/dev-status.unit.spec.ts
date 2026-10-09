import { test, expect } from '@playwright/test';
import { compose } from '../../tasks/dev/feedback';

// dev:status composes from facts their owners answer (.plans/dev-feedback.md); given facts, it says
// what matters: a red commit by name, a branch behind it, nothing when all is landed and green.

const commit = (sha: string, subject: string) => ({ sha, subject, author: 'someone', when: 'now' });
const run = (sha: string, conclusion: string | null, status = 'completed') => ({ headSha: sha, status, conclusion, url: `https://example.test/runs/${sha}` });

test('a red commit on main is named, and a branch behind it is told', () => {
  const lines = compose({
    commits: [commit('bbbbbbb1', 'break it'), commit('aaaaaaa1', 'fine')],
    runs: [run('bbbbbbb1', 'failure'), run('aaaaaaa1', 'success')],
    branches: [{ branch: 'main', path: '/m', ahead: 0, behind: 0, base: 'origin/main' }, { branch: 'feature', path: '/w', ahead: 2, behind: 1, base: 'origin/main' }],
    translations: 'complete and current',
  });
  expect(lines.find(line => line.includes('bbbbbbb'))).toContain('RED https://example.test/runs/bbbbbbb1');
  expect(lines.find(line => line.includes('aaaaaaa'))).toContain('green');
  expect(lines).toContain('  main is red at bbbbbbb: fix that before landing more on it.');
  expect(lines.find(line => line.startsWith('  feature'))).toContain('2 ahead, 1 behind main (behind a red commit');
});

test('all green and landed says so, and a running check is running', () => {
  const lines = compose({
    commits: [commit('ccccccc1', 'latest'), commit('aaaaaaa1', 'fine')],
    runs: [run('ccccccc1', null, 'in_progress'), run('aaaaaaa1', 'success')],
    branches: [{ branch: 'main', path: '/m', ahead: 0, behind: 0, base: 'origin/main' }],
    deployments: 'ORIGIN  SERVICE\nhttps://x  s',
    pulls: [{ number: 9, title: 'bump', author: 'dependabot' }],
    left: ['1. The next thing', '2. The one after'],
  });
  expect(lines.find(line => line.includes('ccccccc'))).toContain('running https://example.test/runs/ccccccc1');
  expect(lines.some(line => line.includes('main is red'))).toBe(false);
  expect(lines).toContain('work in progress: none (every branch is landed).');
  expect(lines).toContain('  https://x  s');
  expect(lines).toContain('  #9 bump (dependabot)');
  expect(lines).toContain('  1. The next thing');
});
