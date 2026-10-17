import { test, expect } from '@playwright/test';
import { pagePrints } from '../../packages/ui/src/cli/i18n';

// The formatter (vp fmt) lines up a table's columns and nothing else in a page's words: a translation made from the
// page before it ran is still the page's, so formatting never sends a page back to the translator.

const page = (table: string) => `---\ntitle: "T"\n---\n\nIntro.\n\n## Part\n\n${table}\n\nText after.\n`;

test("a table's padding is not a change to the page", () => {
  const tight = page('| A | B |\n| --- | --- |\n| one | two words |');
  const padded = page('| A   | B         |\n| --- | --------- |\n| one | two words |');
  expect(pagePrints(padded)).toEqual(pagePrints(tight));
});

test('a changed word still is', () => {
  expect(pagePrints(page('| A | B |\n| --- | --- |\n| one | two words |'))).not.toEqual(pagePrints(page('| A | B |\n| --- | --- |\n| one | three words |')));
});
