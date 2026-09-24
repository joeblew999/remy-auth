import type { Route } from './+types/robots';
export function loader({ request }: Route.LoaderArgs) {
  return new Response(`User-agent: *\nAllow: /\nSitemap: ${new URL(request.url).origin}/sitemap.xml\n`,
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
