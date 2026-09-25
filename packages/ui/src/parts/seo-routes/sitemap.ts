import type { SitemapEntry } from '../../seo';

// The seo-routes part's sitemap is the package's own (../../seo.ts: sitemapXml, the one builder a
// prerendered app also writes its file with): the package's site pages and every listed part's, then
// the app's own entries from its src/parts/seo-routes.ts, for example remy-auth's docs.

export type { SitemapEntry };

/** What an app's src/parts/seo-routes.ts exports as `sitemapEntries`: its own entries for the request's origin. */
export type SitemapEntries = (origin: string) => SitemapEntry[];
