import { createFileRoute } from '@tanstack/react-router';
import { sitemapType, sitemapXml } from '@joeblew999/remy-ui/seo';
import { docsSitemap } from '../docs/source.server';
import { referenceUrls } from '../docs/reference.server';

// Both docs sites' pages in every language each has its own text in, with hreflang alternates, and the API
// reference's pages: what
// search engines (and their AI answers) index. The shared sitemap writer (@joeblew999/remy-ui/seo).
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        return new Response(sitemapXml({ origin, paths: [], extra: [{ loc: `${origin}/`, alternates: [] }, ...docsSitemap(origin), ...referenceUrls().map(url => ({ loc: `${origin}${url}`, alternates: [] }))] }), { headers: { 'Content-Type': sitemapType, 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } });
      },
    },
  },
});
