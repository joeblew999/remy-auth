import type { MDXComponents } from 'mdx/types';
import browserCollections from '../../.source/browser';
import { docsRowForSlug } from './table.js';

// The docs' compiled content (Fumadocs MDX's browser entry): one lazy chunk per page. Kept small,
// because the router imports it to load the page's chunk before hydration (preloadDocsContent).

/** Loads and renders a page's compiled Markdown; after `preload` it renders without suspending. */
export const docsContent = browserCollections.docs.createClientLoader({
  id: 'docs',
  component: (loaded, props: { components: MDXComponents }) => <loaded.default components={props.components} />,
});

/**
 * Before the browser hydrates a docs page, its content chunk is loaded (the router's `hydrate`
 * option, which hydration awaits). Otherwise the article would suspend during hydration, and the
 * router's first update would make React replace the server's text with nothing until the chunk arrives.
 */
export async function preloadDocsContent(pathname: string) {
  const slug = pathname.match(/^\/[^/]+\/docs(?:\/([^/]+))?\/?$/);
  const row = slug && docsRowForSlug(slug[1] ?? '');
  if (row) await docsContent.preload(row.file);
}
