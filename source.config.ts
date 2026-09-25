import { dirname, join, relative, resolve } from 'node:path';
import { readdirSync, statSync } from 'node:fs';
import { defineCollections, defineConfig } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import type { Root, Link } from 'mdast';
import type { Root as HastRoot, Element } from 'hast';
import { valueToEstree } from 'estree-util-value-to-estree';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import { branch, docsI18nDir, docsPath, docsRowForFile, docsTable, docsTranslationOf, firstHeading, repository } from './src/docs/table.js';

// Fumadocs MDX over the repository's own Markdown, read in place (.plans/docs-site.md, D1): the docs
// table names the files, nothing is copied, and the generated entry files live in .source/ (ignored).
// Node imports stay in this file: Fumadocs evaluates it at build time only, so they never reach a
// browser bundle.

const root = import.meta.dirname;

/** The translations on disk (.plans/docs-site.md, "Docs translations"): docs/i18n/<locale>/<a docs table file>. */
const translations = readdirSync(join(root, docsI18nDir), { recursive: true, encoding: 'utf8' })
  .map(path => `${docsI18nDir}/${path.split('\\').join('/')}`)
  .filter(path => docsTranslationOf(path))
  .sort();


/**
 * Relative links between repository files: a link to another docs file becomes its docs page
 * (/docs/<slug>#hash, localized by the router), any other file a link to it on GitHub, which exists
 * because the links check proves it. Links with a scheme and same-page #hash links stay as written.
 */
function remarkRepositoryLinks() {
  return (tree: Root, file: VFile) => {
    // A translation links as its English file does: its links resolve from the English file's folder.
    const path = relative(root, file.path).split('\\').join('/');
    const from = dirname(docsTranslationOf(path)?.row.file ?? path);
    visit(tree, 'link', (node: Link) => {
      if (/^[a-z][a-z0-9+.-]*:/i.test(node.url) || node.url.startsWith('#') || node.url.startsWith('/')) return;
      const [path, hash] = node.url.split('#');
      const target = relative(root, resolve(root, from, path)).split('\\').join('/');
      const row = docsRowForFile(target);
      if (row) node.url = `${docsPath(row.slug)}${hash ? `#${hash}` : ''}`;
      else node.url = `${repository}/${statSync(join(root, target), { throwIfNoEntry: false })?.isDirectory() ? 'tree' : 'blob'}/${branch}/${target}${hash ? `#${hash}` : ''}`;
    });
  };
}

/**
 * The page's finished HTML tree (after Shiki, heading ids and the link rewrite), exported as `tree`
 * (.plans/docs-site.md, "Server-rendered docs"). The server sends it with the page's loader data and
 * the page renders it with hast-util-to-jsx-runtime, as Fumadocs' own server-compiled Markdown does
 * (`@fumadocs/local-md`), so no page's compiled code reaches the browser. The export is an MDX ESM
 * node, the way fumadocs-mdx adds its own exports; positions and Shiki's `icon` (for Fumadocs UI's
 * code block, unused here) are dropped to keep the data small.
 */
function rehypeExportTree() {
  return (tree: HastRoot) => {
    // Only the HTML: Fumadocs' own exports (frontmatter, toc, structuredData) are ESM nodes in the tree.
    const copy = { ...tree, children: structuredClone(tree.children.filter(node => node.type !== 'mdxjsEsm')) };
    visit(copy, node => { delete node.position; });
    visit(copy, 'element', (node: Element) => { delete node.properties.icon; });
    const program = { type: 'Program' as const, sourceType: 'module' as const, body: [{
      type: 'ExportNamedDeclaration' as const, specifiers: [], attributes: [], source: null,
      declaration: { type: 'VariableDeclaration' as const, kind: 'const' as const,
        declarations: [{ type: 'VariableDeclarator' as const, id: { type: 'Identifier' as const, name: 'tree' }, init: valueToEstree(copy) }] },
    }] };
    tree.children.push({ type: 'mdxjsEsm', value: '', data: { estree: program } });
  };
}

export const docs = defineCollections({
  type: 'doc',
  dir: '.',
  files: [...docsTable.map(row => row.file), ...translations],
  // Lazy: the Worker loads a page's compiled content only when that page is requested; the page's
  // `tree` export travels as data (src/docs/source.server.ts), and the browser entry is not used.
  async: true,
  schema: ({ source }) => pageSchema.extend({ title: pageSchema.shape.title.default(firstHeading(source)) }),
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: plugins => [remarkRepositoryLinks, ...plugins],
    rehypePlugins: plugins => [...plugins, rehypeExportTree],
    // GitHub's own "default" themes: their comment colours keep 4.5:1 contrast on both backgrounds
    // (the older github-dark's comments do not), which Lighthouse's accessibility audit requires.
    rehypeCodeOptions: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
  },
});
