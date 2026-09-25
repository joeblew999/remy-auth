/**
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
export const appPaths = ['/app', '/app/formats', '/app/demo', '/app/location'];
/** Every page, both kinds: entry redirects, request IDs and code splitting cover them all. */
export const allPaths = [...sitePaths, ...appPaths];
/** Whether a de-localized path is an app page. */
export const isAppPath = path => path === '/app' || path.startsWith('/app/');
