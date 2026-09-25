// Shared answers for this app's read-only server routes (robots.txt, sitemap.xml).

/**
 * Crawl metadata changes only with a deployment and depends only on the request's origin, so
 * browsers and shared caches may keep it for an hour; `s-maxage` states the shared-cache lifetime
 * explicitly, ready for Workers Caching (.plans/caching.md). HTML pages stay no-store (localizedWorker).
 */
export const crawlCache = 'public, max-age=3600, s-maxage=3600';

/**
 * Start dispatches a method without its own handler to `ANY`, and HEAD to GET, so a route that
 * spreads this next to its GET answers every other method with 405 and the methods it allows,
 * instead of falling through to page rendering.
 */
export const readOnly = {
  ANY: () => new Response(null, { status: 405, headers: { Allow: 'GET, HEAD', 'Cache-Control': 'no-store' } }),
};
