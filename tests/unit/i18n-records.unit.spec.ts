import { test, expect } from 'vite-plus/test';
import {
  changedSections,
  madeFrom,
  splice,
  pagePrints,
  print,
  sections,
  staleKeys,
  withRecord,
  withoutRecord,
} from '../../packages/ui/src/cli/i18n';

// Each translation records what it was made from (i18n.ts): staleness is the record against the English,
// with no git history, so a Mac, a cloud agent and GitHub's shallow checkout agree; and the record names
// the sections to translate again, so a one-line change is not a whole page (owner, 2026-10-17).

const english =
  '---\ntitle: "Guide"\n---\n\nIntro.\n\n## One\n\nFirst.\n\n```md\n## not a heading\n```\n\n## Two\n\nSecond.\n';
const spanish =
  '---\ntitle: "Guía"\n---\n\nIntroducción.\n\n## Uno\n\nPrimero.\n\n```md\n## not a heading\n```\n\n## Dos\n\nSegundo.\n';

test('a page splits at its ## headings, never inside fenced code', () => {
  expect(sections(english)).toHaveLength(3);
  expect(sections(english)[1]).toContain('## not a heading');
  expect(sections(english).join('\n')).toBe(english);
});

test('the record sits in the frontmatter and comes off again whole', () => {
  const recorded = withRecord(spanish, pagePrints(english));
  expect(madeFrom(recorded)).toEqual(pagePrints(english));
  expect(withoutRecord(recorded)).toBe(spanish);
  expect(withRecord(recorded, ['a', 'b', 'c'])).toBe(withRecord(spanish, ['a', 'b', 'c']));
  expect(madeFrom(spanish)).toBeUndefined();
});

test('a changed section is named; a page that does not line up with its record is translated whole', () => {
  const recorded = withRecord(spanish, pagePrints(english));
  expect(changedSections(english, recorded)).toEqual([]);
  expect(changedSections(english.replace('Second.', 'Second, changed.'), recorded)).toEqual([2]);
  expect(changedSections(english + '\n## Three\n\nThird.\n', recorded)).toBeUndefined();
  expect(changedSections(english, spanish)).toBeUndefined();
});

test('a catalog key is stale when its English differs from its record, or it has none', () => {
  const en = { a: 'Hello', b: 'Bye', c: 'New' };
  const es = { a: 'Hola', b: 'Adiós' };
  expect(staleKeys(en, es, { a: print('Hello'), b: print('Bye') })).toEqual([]);
  expect(staleKeys({ ...en, b: 'Goodbye' }, es, { a: print('Hello'), b: print('Bye') })).toEqual(['b']);
  expect(staleKeys(en, es, { a: print('Hello') })).toEqual(['b']);
});

test('a spliced section keeps the blank line before the next heading (it was lost on 2026-10-17)', () => {
  const recorded = withRecord(spanish, pagePrints(english));
  const result = splice(
    english,
    recorded,
    new Map([[1, '## Uno\n\nPrimero, otra vez.\n\n```md\n## not a heading\n```']]),
  );
  expect(result).toBe(spanish.replace('Primero.', 'Primero, otra vez.'));
  expect(sections(result)).toHaveLength(3);
});

test("a docs menu's words are its title and its separators' and links' labels, put back in their places", async () => {
  const { menuIn, menuWords } = await import('../../packages/ui/src/cli/i18n');
  const menu = { title: 'Remy product guide', pages: ['index', '---Help---', 'faq', '[API reference](/reference)'] };
  expect(menuWords(menu)).toEqual({ title: 'Remy product guide', 'pages.1': 'Help', 'pages.3': 'API reference' });
  const spanish = menuIn(menu, { title: 'Guía de Remy', 'pages.1': 'Ayuda', 'pages.3': 'Referencia de la API' });
  expect(spanish).toEqual({
    title: 'Guía de Remy',
    pages: ['index', '---Ayuda---', 'faq', '[Referencia de la API](/reference)'],
    translatedFrom: print(menuWords(menu)),
  });
});
