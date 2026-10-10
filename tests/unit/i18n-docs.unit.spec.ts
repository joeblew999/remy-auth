import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { broken, pageFrom } from '../../tasks/i18n/docs/page';

// The docs translator writes pages and nothing else (tasks/i18n/docs/page.ts). On 2026-10-09 the agent
// returned nothing, the pipe lost its failure and the word "null" was committed as a Spanish page: the
// docs stopped building on main and every check was green. Plain functions, so they run without a
// build, on every check and on GitHub, which is the only check a translation's own commit gets.

const english = '---\ntitle: "How we work"\ndescription: "How people and agents work here."\n---\n\nThis document owns how people and agents work.\n';
const spanish = '---\ntitle: "Cómo trabajamos"\ndescription: "Cómo trabajan aquí las personas y los agentes."\n---\n\nEste documento define cómo trabajan las personas y los agentes.\n';

test('what the agent returns is written only when it is the page: nothing, null and text without the frontmatter are refused', () => {
  expect(pageFrom({ content: spanish }, english)).toEqual({ content: spanish });
  for (const nothing of [undefined, null, 'null', {}, { content: null }]) expect(pageFrom(nothing, english)).toEqual({ refused: 'the agent returned no page' });
  // What was committed on 2026-10-09, and its neighbours: a page cut short, a page without its title.
  expect(pageFrom({ content: 'null' }, english)).toEqual({ refused: 'what the agent returned is not the page: it has no frontmatter, and its English page has one' });
  expect(pageFrom({ content: spanish.replace(/^title:.*\n/m, '') }, english)).toEqual({ refused: 'what the agent returned is not the page: its frontmatter lacks title' });
  expect(pageFrom({ content: spanish.replace(/^title:.*$/m, 'title: ""') }, english)).toEqual({ refused: 'what the agent returned is not the page: its frontmatter lacks title' });
  expect(pageFrom({ content: spanish.slice(0, spanish.indexOf('\n\n') + 1) }, english)).toEqual({ refused: 'what the agent returned is not the page: it has no text after the frontmatter' });
});

test('every translated docs page in the repository is a page of its English', () => {
  const root = 'docs/content';
  const files = existsSync(root) ? readdirSync(root, { recursive: true, encoding: 'utf8' }).map(file => `${root}/${file}`) : [];
  const translated = files.flatMap(file => {
    const language = /\.([a-z]{2,3}(?:-[A-Za-z]{2,4})?)\.(mdx?)$/.exec(file);
    const source = language && file.slice(0, language.index) + '.' + language[2];
    return source && existsSync(source) ? [{ file, source }] : [];
  });
  expect(translated.length).toBeGreaterThan(0);
  const wrong = translated.flatMap(({ file, source }) => {
    const why = broken(readFileSync(source, 'utf8'), readFileSync(file, 'utf8'));
    return why ? [`${file}: ${why}`] : [];
  });
  expect(wrong).toEqual([]);
});
