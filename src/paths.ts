import { allPaths, appPaths, sitePaths } from '@joeblew999/remy-ui/paths';
import { docsPaths } from './docs/table.js';

// This app's pages beside the shared package's (paths.js owns the two kinds): the docs, site pages in
// English only (src/docs/table.js), and the answer page, an app page. remy-auth-app has neither.

/** Site pages in every language, with hreflang alternates. The docs are site pages too, but English only: docsPaths. */
export { sitePaths, docsPaths };
/** The answer page (.plans/docs-site.md, decision 5). */
export const askPath = '/app/ask';
/** Every app page: the shared ones and this app's own. */
export const appPagePaths = [...appPaths, askPath];
/** Every site page, the docs included. */
export const siteAndDocsPaths = [...sitePaths, ...docsPaths];
/** Every page of this app, both kinds: entry redirects, request IDs, CSP and code splitting cover them all. */
export const everyPath = [...allPaths, ...docsPaths, askPath];
