import { locales, baseLocale, isLocale, type Locale } from '@remy/ui/locale';

type Match = { loaderData?: unknown } | undefined;

/**
 * Title, description, self-canonical and reciprocal hreflang links for a public route.
 * Derived from the URL and the root loader's origin, so it is complete in the initial
 * HTML even while a route's client loader fallback renders. `x-default` is the
 * language chooser at the same path without a locale.
 */
export function pageMeta(params: { locale?: string }, matches: readonly Match[], path: string,
  title: (locale: Locale) => string, description: (locale: Locale) => string) {
  const locale = isLocale(params.locale) ? params.locale : baseLocale;
  const origin = (matches[0]?.loaderData as { origin?: string } | undefined)?.origin ?? '';
  const href = (value: string) => `${origin}/${value}${path}`;
  return [
    { title: `${title(locale)} | Remy` },
    { name: 'description', content: description(locale) },
    { tagName: 'link', rel: 'canonical', href: href(locale) },
    ...locales.map(value => ({ tagName: 'link', rel: 'alternate', hrefLang: value, href: href(value) })),
    { tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: `${origin}${path || '/'}` },
  ];
}
