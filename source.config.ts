import { dirname, join, relative, resolve } from 'node:path';
import { statSync } from 'node:fs';
import { defineCollections, defineConfig } from 'fumadocs-mdx/config';
import { pageSchema } from 'fumadocs-core/source/schema';
import type { Root, Link } from 'mdast';
import type { VFile } from 'vfile';
import { visit } from 'unist-util-visit';
import { branch, docsPath, docsRowForFile, docsTable, repository } from './src/docs/table.js';

// Fumadocs MDX over the repository's own Markdown, read in place (.plans/docs-site.md, D1): the docs
// table names the files, nothing is copied, and the generated entry files live in .source/ (ignored).
// Node imports stay in this file: Fumadocs evaluates it at build time only, so they never reach a
// browser bundle.

const root = import.meta.dirname;

/** The file's first "# " heading: plain Markdown has no frontmatter, so the title comes from the text. */
const firstHeading = (source: string) => source.match(/^#\s+(.+)$/m)?.[1].trim() ?? '';

/**
 * Relative links between repository files: a link to another docs file becomes its docs page
 * (/docs/<slug>#hash, localized by the router), any other file a link to it on GitHub, which exists
 * because the links check proves it. Links with a scheme and same-page #hash links stay as written.
 */
function remarkRepositoryLinks() {
  return (tree: Root, file: VFile) => {
    const from = relative(root, dirname(file.path));
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

export const docs = defineCollections({
  type: 'doc',
  dir: '.',
  files: docsTable.map(row => row.file),
  // Lazy: each page's compiled content is its own chunk, loaded only on that page.
  async: true,
  schema: ({ source }) => pageSchema.extend({ title: pageSchema.shape.title.default(firstHeading(source)) }),
});

export default defineConfig({
  mdxOptions: {
    remarkPlugins: plugins => [remarkRepositoryLinks, ...plugins],
    // GitHub's own "default" themes: their comment colours keep 4.5:1 contrast on both backgrounds
    // (the older github-dark's comments do not), which Lighthouse's accessibility audit requires.
    rehypeCodeOptions: { themes: { light: 'github-light-default', dark: 'github-dark-default' } },
  },
});
