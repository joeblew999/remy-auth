import { createFileRoute } from '@tanstack/react-router';
import { robotsTxt, robotsType } from '@joeblew999/remy-ui/seo';

// Everything allowed, and where the sitemap is (the shared writer, @joeblew999/remy-ui/seo).
export const Route = createFileRoute('/robots.txt')({
  server: { handlers: { GET: ({ request }) => new Response(robotsTxt(new URL(request.url).origin), { headers: { 'Content-Type': robotsType, 'Cache-Control': 'public, max-age=3600, s-maxage=3600' } }) } },
});
