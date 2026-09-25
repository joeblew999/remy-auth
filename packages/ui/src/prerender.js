import { baseLocale, locales, localizeHref } from './paraglide/runtime.js';
import { allPaths } from './paths.js';

/**
 * The pages a fully prerendered app (TanStack Start's `prerender.pages`) writes at build time: every
 * page (site and app, paths.js) un-localized and in every locale, from Paraglide's URL patterns
 * (localizeHref), then `files` (the robots.txt and sitemap server routes, written as files), then the
 * localized not-found route as each locale's 404.html. Cloudflare serves the nearest 404.html with a
 * 404 status (not_found_handling "404-page"); /404.html, the base locale's, is the fallback.
 * Pure data: vite.config imports it.
 */
export function prerenderPages({ notFoundPath, paths = allPaths, files = ['/robots.txt', '/sitemap.xml'] }) {
  return [
    ...paths.map(path => ({ path: path || '/' })),
    ...locales.flatMap(locale => paths.map(path => ({ path: localizeHref(path || '/', { locale }) }))),
    ...files.map(path => ({ path })),
    ...locales.map(locale => ({
      path: localizeHref(notFoundPath, { locale }),
      prerender: { outputPath: locale === baseLocale ? '/404.html' : `/${locale}/404.html` },
    })),
  ];
}
