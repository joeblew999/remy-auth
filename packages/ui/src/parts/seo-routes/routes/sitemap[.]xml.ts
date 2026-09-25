import { createFileRoute } from '@tanstack/react-router';
import { sitePaths } from '../../../paths.js';
import { sitePaths as partSitePaths } from 'virtual:remy-parts';
import { sitemapEntries } from 'virtual:remy-parts/seo-routes/app';
import { siteEntries, sitemapXml } from '../sitemap';
import { crawlCache, readOnly } from '../server-routes';

// Every public path in every locale, each with its hreflang alternates and the un-localized x-default:
// the package's site pages and those of every listed part; then the app's own entries (its
// src/parts/seo-routes.ts), for remy-auth its docs by the rule of their pages' heads.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const entries = [...siteEntries(origin, [...sitePaths, ...partSitePaths]), ...(sitemapEntries?.(origin) ?? [])];
        return new Response(sitemapXml(entries), { headers: { 'Content-Type': 'application/xml; charset=utf-8', 'Cache-Control': crawlCache } });
      },
      ...readOnly,
    },
  },
});
