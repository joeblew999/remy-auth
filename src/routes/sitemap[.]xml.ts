import { createFileRoute } from '@tanstack/react-router';
import { locales } from '@joeblew999/remy-ui/locale';
import { publicPaths } from '@joeblew999/remy-ui/paths';

// Every public path in every locale, each with its hreflang alternates and the un-localized x-default.
export const Route = createFileRoute('/sitemap.xml')({
  server: {
    handlers: {
      GET: ({ request }) => {
        const origin = new URL(request.url).origin;
        const entries = locales.flatMap(locale => publicPaths.map(path => {
          const alternates = [...locales.map(value => [value, `${origin}/${value}${path}`]), ['x-default', `${origin}${path || '/'}`]]
            .map(([lang, href]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${href}"/>`).join('');
          return `<url><loc>${origin}/${locale}${path}</loc>${alternates}</url>`;
        }));
        return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.join('')}</urlset>`,
          { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
      },
    },
  },
});
