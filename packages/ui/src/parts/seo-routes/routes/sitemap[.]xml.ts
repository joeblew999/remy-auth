/// <reference path="../../virtual.d.ts" />
import { createFileRoute } from '@tanstack/react-router';
import { sitePaths as partSitePaths } from 'virtual:remy-parts';
import { sitemapEntries } from 'virtual:remy-parts/seo-routes/app';
import { registeredApp } from '../../../app-config';
import { sitemapXml, sitemapType } from '../../../seo';
import { crawlCache, readOnly } from '../server-routes';

// Every public path in every locale, each with its hreflang alternates and the un-localized x-default
// (the package's sitemapXml): the app's site pages (defineRemyApp's `sitePaths`) and those of every
// listed part; then the app's own entries (its src/parts/seo-routes.ts), for remy-auth its docs by the rule of their pages' heads.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const xml = sitemapXml({ origin, paths: [...(registeredApp()?.sitePaths ?? ['']), ...partSitePaths], extra: sitemapEntries?.(origin) ?? [] });
        return new Response(xml, { headers: { 'Content-Type': sitemapType, 'Cache-Control': crawlCache } });
      },
      ...readOnly,
    },
  },
});
