import { createFileRoute } from '@tanstack/react-router';
import { sitemapXml, sitemapType, type SitemapEntry } from '@joeblew999/remy-ui/seo';
import { docsLangs } from '../docs/source.server';
import { docsLocale, docsPath, docsTable } from '../docs/table.js';
import { crawlCache, readOnly } from '../server-routes';

// The package's sitemap (every site page in every locale, with hreflang alternates and x-default), then
// the docs by the rule of their pages' heads: each language a page has its own text in, with those
// languages as alternates and English as x-default; a page only in English, its /en URL alone
// (.plans/docs-site.md, decision 3 and "Docs translations").
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const docs = docsTable.flatMap(({ slug }): SitemapEntry[] => {
          const path = docsPath(slug);
          const langs = docsLangs(slug);
          const alternates = langs.length > 1
            ? [...langs.map(value => [value, value]), ['x-default', docsLocale]].map(([hrefLang, value]) => ({ hrefLang, href: `${origin}/${value}${path}` }))
            : [];
          return langs.map(locale => ({ loc: `${origin}/${locale}${path}`, alternates }));
        });
        return new Response(sitemapXml({ origin, extra: docs }), { headers: { 'Content-Type': sitemapType, 'Cache-Control': crawlCache } });
      },
      ...readOnly,
    },
  },
});
