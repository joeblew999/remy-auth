import { allPaths, appPaths, sitePaths } from '@joeblew999/remy-showcase/paths';

// This app's pages: the shared package's (paths.js owns the two kinds), and one of its own, the notes
// demo, which needs this Worker's sign-in and data (src/notes/). The docs are the docs Worker's
// (docs/), at its own origin (DOCS_ORIGIN).

/** Site pages in every language, with hreflang alternates. */
export { sitePaths };
/** This app's own app pages, beside the shared ones. */
export const ownAppPaths = ['/app/notes'];
/** Every app page: the shared ones and this app's own. */
export const appPagePaths = [...appPaths, ...ownAppPaths];
/** Every page of this app, both kinds: entry redirects, request IDs, CSP and code splitting cover them all. */
export const everyPath = [...allPaths, ...ownAppPaths];
