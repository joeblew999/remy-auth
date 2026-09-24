import { locales } from '@remy/ui/locale';
import type { Route } from './+types/sitemap';
export function loader({ request }: Route.LoaderArgs) {
  const origin = new URL(request.url).origin;
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${locales.map(locale => `<url><loc>${origin}/${locale}</loc></url>`).join('')}</urlset>`,
    { headers: { 'Content-Type': 'application/xml; charset=utf-8' } });
}
