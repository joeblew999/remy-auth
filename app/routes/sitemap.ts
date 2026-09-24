import { locales } from '@joeblew999/remy-ui/locale';
import { publicPaths } from '@joeblew999/remy-ui/paths';
import type { Route } from './+types/sitemap';
export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  const entries = locales.flatMap(locale => publicPaths.map(path => {
    const alternates = [...locales.map(value => [value, `${origin}/${value}${path}`]), ['x-default', `${origin}${path || '/'}`]]
      .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('');
    return `<url><loc>${origin}/${locale}${path}</loc>${alternates}</url>`;
  }));
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
