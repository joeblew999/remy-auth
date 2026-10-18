import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { ownSrc } from '../own.ts';
import { visit } from 'unist-util-visit';
import type { Plugin } from 'unified';
import type { Root } from 'mdast';

// The app's own words in its docs: `:ui[nav_notes]` in a page is the word the app shows for that entry of its
// Paraglide catalog, in the page's language ("Notes" on an English page, "Notas" on a Spanish one). The catalog
// is the one source of every label a person sees, so the guide never types one out and cannot drift from the
// app. The word replaces the marker before anything reads the page, so the site, each page's .md and
// llms.txt all carry the word, never the marker.
//
// The catalogs: this package's messages/<lang>.json (the labels every app shares) and the app's own
// messages/<lang>.json beside its docs/, when it has one. A page's language is its file's (formats.es.mdx is
// Spanish); a word missing in that language reads in the base one, which the translation check reports. A
// marker naming no entry stops the build, naming the page: a label renamed in the app cannot leave the guide behind.

// The package's catalogs, found from its manifest (own.ts), so the same from src/ here and from dist/ in an installed
// app; the package ships messages/ (its files), and a missing base catalog stops the build rather than leaving every
// shared word out (issue #44).
const packageMessages = join(ownSrc, '..', 'messages');

/** The remark plugin, for an app whose root (the folder holding docs/) is `root`. */
export function remarkUiWords({ root, baseLocale = 'en' }: { root: string; baseLocale?: string }): Plugin<[], Root> {
  const cache = new Map<string, Record<string, unknown>>();
  const catalog = (lang: string): Record<string, unknown> => {
    if (!cache.has(lang)) {
      const read = (file: string): Record<string, unknown> =>
        existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
      const shared = join(packageMessages, `${baseLocale}.json`);
      if (!existsSync(shared)) throw new Error(`remark-ui-words: the package's catalog is missing (${shared})`);
      cache.set(lang, {
        ...read(join(packageMessages, `${lang}.json`)),
        ...read(join(root, 'messages', `${lang}.json`)),
      });
    }
    return cache.get(lang) as Record<string, unknown>;
  };
  return () => (tree, file) => {
    const lang = /\.([a-z]{2,3}(?:-[A-Za-z]+)?)\.mdx?$/.exec(file.path ?? '')?.[1] ?? baseLocale;
    visit(tree, 'textDirective', (node, index, parent) => {
      if (node.name !== 'ui' || !parent || index === undefined) return;
      const key = node.children
        ?.map((child) => (child as { value?: string }).value ?? '')
        .join('')
        .trim();
      const word = catalog(lang)[key] ?? catalog(baseLocale)[key];
      if (typeof word !== 'string')
        throw new Error(`${file.path}: :ui[${key}] names no word in the app's catalog (messages/${baseLocale}.json)`);
      parent.children[index] = { type: 'text', value: word };
    });
  };
}
