import { defineDocs } from 'fumadocs-mdx/macro';

// This app's two docs collections, product docs for its users (content/users, at /docs) and
// developer docs (content/dev, at /dev), compiled by fumadocs-mdx (its macro compiles this file, which is why it lives
// here and not in @joeblew999/remy-ui: the macro never compiles node_modules). Browser-safe: the page renders its
// compiled Markdown from here; the loaders, which the browser never loads, are in source.ts.
// Each call spells its options out: the macro reads them statically.
export const usersDocs = defineDocs({
  dir: 'content/users',
  docs: { async: true, lastModified: true, postprocess: { includeProcessedMarkdown: true } },
});
export const devDocs = defineDocs({
  dir: 'content/dev',
  docs: { async: true, lastModified: true, postprocess: { includeProcessedMarkdown: true } },
});
export const collections = { docs: usersDocs, dev: devDocs };
export type SiteName = keyof typeof collections;
