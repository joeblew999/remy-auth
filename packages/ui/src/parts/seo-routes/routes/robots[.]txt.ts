import { createFileRoute } from '@tanstack/react-router';
import { crawlCache, readOnly } from '../server-routes';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) => new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`,
        { headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': crawlCache } }),
      ...readOnly,
    },
  },
});
