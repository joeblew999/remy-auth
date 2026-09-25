import { createFileRoute } from '@tanstack/react-router';
import { robotsTxt, robotsType } from '../../../seo';
import { crawlCache, readOnly } from '../server-routes';

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: ({ request }) => new Response(robotsTxt(new URL(request.url).origin), { headers: { 'Content-Type': robotsType, 'Cache-Control': crawlCache } }),
      ...readOnly,
    },
  },
});
