// The seo-routes part's checks (moved with its code): the sitemap (sitemapChecks, over the package's
// site pages, every listed part's and the app's own) and both routes as read-only server routes.
import { sitemapChecks } from '../../checks.js';
import { problemChecks } from '../../showcase/problem.checks.js';

// The header the routes must send, stated here rather than imported, so a changed value fails the check.
const crawlCache = 'public, max-age=3600, s-maxage=3600';

/** `paths`: the app's site pages (the package's and its own); `oneLanguage` as publicPageChecks; `partPaths`: the listed parts' site pages. */
export function seoRoutesChecks({ paths, oneLanguage, partPaths = [] } = {}) {
  if (!paths) throw new Error("seo-routes checks need the app's site paths: partChecks({ options: { 'seo-routes': { paths } } })");
  sitemapChecks({ paths: [...paths, ...partPaths], oneLanguage });
  problemChecks({ serverRoutes: [
    { path: '/robots.txt', type: 'text/plain; charset=utf-8', cache: crawlCache, origin: true },
    { path: '/sitemap.xml', type: 'application/xml; charset=utf-8', cache: crawlCache, origin: true },
  ] });
}
