import { allPaths, appPaths, sitePaths } from '@joeblew999/remy-ui/paths';

// This app's pages: the shared package's (paths.js owns the two kinds). The docs are the docs Worker's
// (docs/), at its own origin (DOCS_ORIGIN).

/** Site pages in every language, with hreflang alternates. */
export { sitePaths };
/** Every app page: the shared ones. */
export const appPagePaths = [...appPaths];
/** Every page of this app, both kinds: entry redirects, request IDs, CSP and code splitting cover them all. */
export const everyPath = [...allPaths];
