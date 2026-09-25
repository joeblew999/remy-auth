import { allPaths, appPaths, sitePaths } from '@joeblew999/remy-ui/paths';
import { docsPaths } from './docs/table.js';

// This app's pages beside the shared package's (paths.js owns the two kinds): the docs, site pages in
// English and their translations (src/docs/table.js), and beside them the docs search and the answer page, site pages
// in every language. remy-auth-app has none of them.

/** Site pages in every language, with hreflang alternates. The docs are site pages too, in English and their translations: docsPaths. */
export { sitePaths, docsPaths };
/** Docs search (.plans/docs-site.md, "Docs search"): a site page; with a query in its address, noindex. Not in the sitemap. */
export const docsSearchPath = '/docs/search';
/**
 * The answer page (.plans/docs-ai-sync.md, "Ask from the site"): a site page beside the docs search,
 * treated as it is: with a question in its address, noindex. Not in the sitemap. It was the app page
 * /app/ask, which now redirects here permanently.
 */
export const askPath = '/docs/ask';
/** Every app page: the shared ones. */
export const appPagePaths = [...appPaths];
/** Every site page, the docs, their search and the answer page included. */
export const siteAndDocsPaths = [...sitePaths, ...docsPaths, docsSearchPath, askPath];
/** Every page of this app, both kinds: entry redirects, request IDs, CSP and code splitting cover them all. */
export const everyPath = [...allPaths, ...docsPaths, docsSearchPath, askPath];
