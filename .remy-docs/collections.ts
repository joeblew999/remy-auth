import { defineDocs } from 'fumadocs-mdx/macro';

// The two docs collections (.plans/docs-for-consumers.md, "Fumadocs fully"): product docs for the app's
// users (/docs) and developer docs (/dev), compiled by fumadocs-mdx. Browser-safe: the page renders its
// compiled Markdown from here; the loaders, which the browser never loads, are in source.ts.
// Each call spells its options out: the macro reads them statically.
export const usersDocs = defineDocs({ dir: 'content/users', docs: { async: true, lastModified: true, postprocess: { includeProcessedMarkdown: true } } });
export const devDocs = defineDocs({ dir: 'content/dev', docs: { async: true, lastModified: true, postprocess: { includeProcessedMarkdown: true } } });
export const collections = { docs: usersDocs, dev: devDocs };
export type SiteName = keyof typeof collections;
