import { locales, localizeUrl, type Locale } from './paraglide/runtime.js';

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
