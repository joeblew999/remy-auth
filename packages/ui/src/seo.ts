import { locales, localizeUrl, type Locale } from './paraglide/runtime.js';
import { sitePaths } from './paths.js';

export type Alternate = { hrefLang: Locale | 'x-default'; href: string };

/**
 * Self-canonical URL and reciprocal hreflang links for a public path, from Paraglide's URL
 * patterns. `x-default` is the un-localized entry URL, which redirects to the visitor's
 * language. Pure: usable in a request, at build time and in the browser.
 */
export function alternates(origin: string, path: string, locale: Locale): { canonical: string; alternates: Alternate[] } {
  const entry = new URL(path || '/', origin);
  const href = (value: Locale) => localizeUrl(entry, { locale: value }).href;
  return {
    canonical: href(locale),
    alternates: [...locales.map(value => ({ hrefLang: value, href: href(value) })), { hrefLang: 'x-default', href: entry.href }],
  };
}

/** One `<url>` of a sitemap: its address and its hreflang alternates (none for a page in one language only). */
export type SitemapEntry = { loc: string; alternates: { hrefLang: string; href: string }[] };

/** Every given site page in every locale, self-canonical, with its hreflang alternates and x-default (`alternates`). */
export function sitemapEntries(origin: string, paths: readonly string[] = sitePaths): SitemapEntry[] {
  return locales.flatMap(locale => paths.map(path => {
    const links = alternates(origin, path, locale);
    return { loc: links.canonical, alternates: links.alternates };
  }));
}

/**
 * The sitemap (sitemaps.org, hreflang as xhtml:link) of the site pages (paths.js; app pages are
 * noindex and never listed), then the app's own `extra` entries (remy-auth's docs). The app's
 * `/sitemap.xml` route answers it with `sitemapType`; a prerendered app writes it as a file.
 */
export function sitemapXml({ origin, paths = sitePaths, extra = [] }: { origin: string; paths?: readonly string[]; extra?: SitemapEntry[] }): string {
  const urls = [...sitemapEntries(origin, paths), ...extra].map(({ loc, alternates: links }) =>
    `<url><loc>${loc}</loc>${links.map(link => `<xhtml:link rel="alternate" hreflang="${link.hrefLang}" href="${link.href}"/>`).join('')}</url>`);
  return `<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.join('')}</urlset>`;
}
export const sitemapType = 'application/xml; charset=utf-8';

/** robots.txt: everything allowed, and where the sitemap is. The app's `/robots.txt` route answers it with `robotsType`. */
export const robotsTxt = (origin: string) => `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`;
export const robotsType = 'text/plain; charset=utf-8';
