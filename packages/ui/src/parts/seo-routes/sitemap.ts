import { locales } from '../../paraglide/runtime.js';
import { alternates, type Alternate } from '../../seo';

// The seo-routes part's sitemap (.plans/parts.md): the package's site pages and every listed part's,
// each in every locale with its hreflang alternates and the un-localized x-default (../../seo.ts),
// then the app's own entries (its src/parts/seo-routes.ts), for example remy-auth's docs.

/** One <url> of the sitemap: its address and its hreflang alternates (none for a page in one language). */
export type SitemapEntry = { loc: string; alternates: { hrefLang: Alternate['hrefLang'] | (string & {}); href: string }[] };

/** What an app's src/parts/seo-routes.ts exports as `sitemapEntries`: its own entries for the request's origin. */
export type SitemapEntries = (origin: string) => SitemapEntry[];

/** Every site path in every locale, self-canonical, with its alternates. */
export const siteEntries = (origin: string, paths: readonly string[]): SitemapEntry[] =>
  locales.flatMap(locale => paths.map(path => {
    const links = alternates(origin, path, locale);
    return { loc: links.canonical, alternates: links.alternates };
  }));

/** The sitemap document. */
export const sitemapXml = (entries: SitemapEntry[]) =>
  `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${entries.map(({ loc, alternates: links }) =>
    `<url><loc>${loc}</loc>${links.map(link => `<xhtml:link rel="alternate" hreflang="${link.hrefLang}" href="${link.href}"/>`).join('')}</url>`).join('')}</urlset>`;
