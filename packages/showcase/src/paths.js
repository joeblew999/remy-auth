/**
 * The showcase's pages (remy-auth's own, which remy-auth-app shows too): nothing in the package defaults to
 * them; every app passes its own pages (defineRemyApp's `sitePaths`, the Worker entry's `entryPaths`, the
 * check sets' `sitePaths` and `appPaths`). `isAppPath`, every app's rule, is the platform's (@joeblew999/remy-ui/paths).
 *
 * The two kinds of page, never mixed. Every path exists in every locale; '' is the site's home.
 *
 * Site pages are for Google and anyone arriving from a search: complete in the server's HTML without
 * JavaScript, indexed, listed in the sitemap with hreflang alternates, judged by Google's level-2
 * checks (Lighthouse, Core Web Vitals).
 *
 * App pages live under /app: they need JavaScript, carry noindex, are left out of the sitemap, and
 * use the app shell (shadcn's sidebar-16 block). Their checks are the app's own.
 */
export const sitePaths = ['', '/formats'];
export const appPaths = ['/app', '/app/formats', '/app/clock', '/app/account', '/app/demo', '/app/location', '/app/settings'];
/** Every page, both kinds: entry redirects, request IDs and code splitting cover them all. */
export const allPaths = [...sitePaths, ...appPaths];
