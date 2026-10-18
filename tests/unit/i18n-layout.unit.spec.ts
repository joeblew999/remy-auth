import { test, expect } from 'vite-plus/test';
import { pagePrints } from '../../packages/remy-cli/src/i18n';

// The formatter (vp fmt) lines up a table's columns and nothing else in a page's words: a translation made from the
// page before it ran is still the page's, so formatting never sends a page back to the translator.

const page = (table: string) => `---\ntitle: "T"\n---\n\nIntro.\n\n## Part\n\n${table}\n\nText after.\n`;

test("a table's padding is not a change to the page", () => {
  const tight = page('| A | B |\n| --- | --- |\n| one | two words |');
  const padded = page('| A   | B         |\n| --- | --------- |\n| one | two words |');
  expect(pagePrints(padded)).toEqual(pagePrints(tight));
});

test('a changed word still is', () => {
  expect(pagePrints(page('| A | B |\n| --- | --- |\n| one | two words |'))).not.toEqual(
    pagePrints(page('| A | B |\n| --- | --- |\n| one | three words |')),
  );
});

// The docs' translation check finds remy-auth's own docs (apps/remy-auth-docs), from the root: on 2026-10-17 it joined an
// absolute folder onto the root, found no site, and reported nothing to translate, so neither a landing nor a
// release would have translated anything.
test("the docs' translation check finds this repository's docs sites", async () => {
  const { docsGaps } = await import('../../packages/remy-cli/src/i18n.ts');
  expect(docsGaps().sites).toBeGreaterThan(0);
});
