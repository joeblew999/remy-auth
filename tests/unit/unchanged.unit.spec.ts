import { test, expect } from '@playwright/test';
import { affects, inert } from '../../packages/ui/src/cli/unchanged';

// A pull request runs only the parts its changes can affect (owner, 2026-10-17: one changed Markdown
// file ran three five-minute jobs). The rule is a function, so a wrong path fails here in seconds.

test('plans, the docs content and Markdown outside the packages change nothing any part checks', () => {
  for (const file of [
    '.plans/now.md',
    '.plans/done/gui.md',
    'docs/content/dev/run-and-test.md',
    'docs/content/users/index.mdx',
    'README.md',
    'CHANGELOG.md',
  ])
    expect(inert(file), file).toBe(true);
  for (const file of ['src/routes/index.tsx', 'packages/ui/README.md', 'package.json', '.github/workflows/ci.yml'])
    expect(inert(file), file).toBe(false);
  for (const part of ['browser', 'audits', 'new-app'] as const)
    expect(affects(part, ['.plans/auth-service.md', 'README.md']), part).toBe(false);
});

test("the app's own code runs browser and audits; new-app only when its inputs change", () => {
  expect(affects('browser', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('audits', ['src/routes/index.tsx'])).toBe(true);
  expect(affects('new-app', ['src/routes/index.tsx'])).toBe(false);
  expect(affects('new-app', ['tests/gui.spec.ts', 'wrangler.jsonc'])).toBe(false);
});

test('the packages, the dependencies and the workflows run every part', () => {
  for (const files of [
    ['packages/ui/src/checks.js'],
    ['package-lock.json'],
    ['.github/workflows/ci.yml'],
    ['.node-version'],
  ]) {
    for (const part of ['browser', 'audits', 'new-app'] as const)
      expect(affects(part, files), `${part} ${files.join(',')}`).toBe(true);
  }
});

test('the blank app and the fixture run new-app alone; a new folder runs browser and audits until decided', () => {
  expect(affects('new-app', ['template/src/routes/index.tsx'])).toBe(true);
  expect(affects('browser', ['template/src/routes/index.tsx', 'fixtures/consumer/run.sh'])).toBe(false);
  expect(affects('browser', ['infra/new-thing.ts'])).toBe(true);
  expect(affects('audits', ['infra/new-thing.ts'])).toBe(true);
});

test('the browser part runs in every language only for what can differ by language', async () => {
  const { languageInput } = await import('../../packages/ui/src/cli/unchanged');
  const text = (body: string) => () => body;
  // Can differ by language: catalogs, fonts and any CSS, locale code by name or by what it calls, browser checks, the runtime.
  for (const file of [
    'packages/ui/messages/th.json',
    'packages/ui/src/fonts.css',
    'src/styles.css',
    'packages/ui/src/locale.ts',
    'packages/ui/src/checks.js',
    'tests/gui.spec.ts',
    'package-lock.json',
    '.node-version',
  ])
    expect(languageInput(file, text('')), file).toBe(true);
  expect(languageInput('packages/ui/src/rows.tsx', text('const at = new Intl.DateTimeFormat(locale)'))).toBe(true);
  expect(languageInput('src/notes.tsx', text('when.toLocaleDateString(lang)'))).toBe(true);
  expect(languageInput('src/gone.tsx', () => undefined)).toBe(false);
  expect(languageInput('packages/ui/src/gone-locale.ts', () => undefined)).toBe(true);
  // Cannot: plain code, version bumps, the tooling, the unit checks.
  for (const file of [
    'src/api/router.ts',
    'package.json',
    'packages/ui/package.json',
    'packages/ui/src/cli/translate.ts',
    'tests/unit/ci.unit.spec.ts',
    'README.md',
  ])
    expect(languageInput(file, text('export const x = 1;')), file).toBe(false);
});
