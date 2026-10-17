import { test, expect } from '@playwright/test';
import { affects, inert } from '../../packages/ui/src/cli/changes';

// A pull request runs only the levels its changes can affect (owner, 2026-10-17: one changed Markdown
// file ran three five-minute jobs). The rule is a function, so a wrong path fails here in seconds.

test('plans, the docs content and Markdown outside the packages change nothing any level checks', () => {
  for (const file of ['.plans/now.md', '.plans/done/gui.md', 'docs/content/dev/gui.md', 'docs/content/users/index.mdx', 'README.md', 'CHANGELOG.md']) expect(inert(file), file).toBe(true);
  for (const file of ['src/routes/index.tsx', 'packages/ui/README.md', 'package.json', '.github/workflows/google.yml']) expect(inert(file), file).toBe(false);
  for (const level of ['every', 'google', 'consumers'] as const) expect(affects(level, ['.plans/auth-service.md', 'README.md']), level).toBe(false);
});

test("the app's own code runs every and google; consumers only when its inputs change", () => {
  expect(affects('every', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('google', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('consumers', ['src/routes/index.tsx'])).toBe(false);
  expect(affects('consumers', ['tests/gui.spec.ts', 'wrangler.jsonc'])).toBe(false);
});

test('the packages, the dependencies and the workflows run every level', () => {
  for (const files of [['packages/ui/src/checks.js'], ['package-lock.json'], ['.github/workflows/google.yml'], ['.node-version']]) {
    for (const level of ['every', 'google', 'consumers'] as const) expect(affects(level, files), `${level} ${files}`).toBe(true);
  }
});

test('the blank app and the fixture run consumers alone; a new folder runs every and google until decided', () => {
  expect(affects('consumers', ['template/src/routes/index.tsx'])).toBe(true);
  expect(affects('every', ['template/src/routes/index.tsx', 'fixtures/consumer/run.sh'])).toBe(false);
  expect(affects('every', ['infra/new-thing.ts'])).toBe(true);
  expect(affects('google', ['infra/new-thing.ts'])).toBe(true);
});
