import { test, expect } from 'vite-plus/test';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkDirective from 'remark-directive';
import remarkStringify from 'remark-stringify';
import { VFile } from 'vfile';
import { remarkUiWords } from '../../packages/remy-ui/src/docs/remark-ui-words.ts';

// The guide names the app's pages and buttons with :ui[key] (packages/remy-ui/src/docs/remark-ui-words.ts): the word
// comes from the app's catalog in the page's language, so the guide and the app cannot call one thing two ways.

const render = (markdown: string, path: string) =>
  String(
    unified()
      .use(remarkParse)
      .use(remarkDirective)
      .use(remarkUiWords({ root: process.cwd() }))
      .use(remarkStringify)
      .processSync(new VFile({ value: markdown, path })),
  );

test("a marker is the app's word, in the page's language", () => {
  expect(render('Open **:ui[nav_notes]** from the menu.', 'content/users/app.md').trim()).toBe(
    'Open **Notes** from the menu.',
  );
  expect(render('Abre **:ui[nav_notes]** en el menú.', 'content/users/app.es.md').trim()).toBe(
    'Abre **Notas** en el menú.',
  );
});

test('a marker naming no word in the catalog stops the build, naming the page', () => {
  expect(() => render('Open :ui[nav_nonsense].', 'content/users/app.md')).toThrow(
    /app\.md: :ui\[nav_nonsense\] names no word/,
  );
});
