import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { Root } from 'hast';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { getUrlOrigin } from '@joeblew999/remy-ui/runtime';
import { docsNav, docsPage } from './source.server';
import { docsLocale, docsPath } from './table.js';

// Start checks at the type level that server function results are serializable, but cannot see
// into the hast tree's unions: registered as a serializable type, as Fumadocs' TanStack Start
// example does for its serialized Markdown (the tree is plain JSON).
declare module '@tanstack/router-core' {
  interface SerializableExtensions {
    docsTree: Root;
  }
}

/** A docs page in a locale from the server (source.server.ts), its article as data; unknown slugs are 404s. */
export const getDocsPage = createServerFn({ method: 'GET' })
  .validator((data: { slug: string; locale: string }) => data)
  .handler(async ({ data: { slug, locale } }) => {
    const page = await docsPage(slug, locale);
    if (!page) throw notFound();
    return page;
  });

/** The docs navigation alone in a locale (English when none is given), for the docs pages that show no article (search, answers). */
export const getDocsNav = createServerFn({ method: 'GET' })
  .validator((locale?: string) => locale)
  .handler(({ data: locale }) => docsNav(locale));

/**
 * A docs route's loader: the whole page from the server, so the server's HTML carries the whole text
 * (complete without JavaScript), hydration renders the same tree from the loader data, and a client
 * navigation fetches the next page's data, never its code.
 */
export function loadDocsPage(slug: string) {
  return getDocsPage({ data: { slug, locale: getLocale() } });
}

/**
 * A docs page's head (.plans/docs-site.md, decision 3 and "Docs translations"): canonical to the page in
 * the language of its text, so a locale without a translation names the /en page and one with a
 * translation names itself. The pages with their own text in more than one language list those as
 * hreflang alternates, English as x-default; a locale without a translation lists none.
 */
export function docsHead(page: { slug: string; title: string; description: string; lang: string; langs: string[] } | undefined) {
  if (!page) return {};
  const url = (locale: string) => `${getUrlOrigin()}/${locale}${docsPath(page.slug)}`;
  const translated = page.lang === getLocale() && page.langs.length > 1;
  return {
    meta: [{ title: `${page.title} | Remy` }, { name: 'description', content: page.description }],
    links: [
      { rel: 'canonical', href: url(page.lang) },
      ...(translated ? [...page.langs.map(locale => ({ rel: 'alternate', hrefLang: locale, href: url(locale) })), { rel: 'alternate', hrefLang: 'x-default', href: url(docsLocale) }] : []),
    ],
  };
}
