import { test, expect } from '@playwright/test';
import { affects, inert } from '../../packages/ui/src/cli/unchanged';

// A pull request runs only the levels its changes can affect (owner, 2026-10-17: one changed Markdown
// file ran three five-minute jobs). The rule is a function, so a wrong path fails here in seconds.

test('plans, the docs content and Markdown outside the packages change nothing any level checks', () => {
  for (const file of ['.plans/now.md', '.plans/done/gui.md', 'docs/content/dev/gui.md', 'docs/content/users/index.mdx', 'README.md', 'CHANGELOG.md']) expect(inert(file), file).toBe(true);
  for (const file of ['src/routes/index.tsx', 'packages/ui/README.md', 'package.json', '.github/workflows/ci.yml']) expect(inert(file), file).toBe(false);
  for (const level of ['every', 'google', 'consumers'] as const) expect(affects(level, ['.plans/auth-service.md', 'README.md']), level).toBe(false);
});

test("the app's own code runs every and google; consumers only when its inputs change", () => {
  expect(affects('every', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('google', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('consumers', ['src/routes/index.tsx'])).toBe(false);
  expect(affects('consumers', ['tests/gui.spec.ts', 'wrangler.jsonc'])).toBe(false);
});

test('the packages, the dependencies and the workflows run every level', () => {
  for (const files of [['packages/ui/src/checks.js'], ['package-lock.json'], ['.github/workflows/ci.yml'], ['.node-version']]) {
    for (const level of ['every', 'google', 'consumers'] as const) expect(affects(level, files), `${level} ${files}`).toBe(true);
  }
});

test('the blank app and the fixture run consumers alone; a new folder runs every and google until decided', () => {
  expect(affects('consumers', ['template/src/routes/index.tsx'])).toBe(true);
  expect(affects('every', ['template/src/routes/index.tsx', 'fixtures/consumer/run.sh'])).toBe(false);
  expect(affects('every', ['infra/new-thing.ts'])).toBe(true);
  expect(affects('google', ['infra/new-thing.ts'])).toBe(true);
});

test('level 1 runs in every language only for what can differ by language', async () => {
  const { languageInput } = await import('../../packages/ui/src/cli/unchanged');
  const text = (body: string) => () => body;
  // Can differ by language: catalogs, fonts and any CSS, locale code by name or by what it calls, browser checks, the runtime.
  for (const file of ['packages/ui/messages/th.json', 'packages/ui/src/fonts.css', 'src/styles.css', 'packages/ui/src/locale.ts', 'packages/ui/src/checks.js', 'tests/gui.spec.ts', 'package-lock.json', '.node-version'])
    expect(languageInput(file, text('')), file).toBe(true);
  expect(languageInput('packages/ui/src/rows.tsx', text('const at = new Intl.DateTimeFormat(locale)'))).toBe(true);
  expect(languageInput('src/notes.tsx', text('when.toLocaleDateString(lang)'))).toBe(true);
  expect(languageInput('src/gone.tsx', () => undefined)).toBe(true);
  // Cannot: plain code, version bumps, the tooling, the unit checks.
  for (const file of ['src/api/router.ts', 'package.json', 'packages/ui/package.json', 'packages/ui/src/cli/translate.ts', 'tests/unit/ci.unit.spec.ts', 'README.md'])
    expect(languageInput(file, text('export const x = 1;')), file).toBe(false);
});
