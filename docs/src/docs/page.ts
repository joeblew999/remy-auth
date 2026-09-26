import { createServerFn } from '@tanstack/react-start';
import { collections, type SiteName } from '../lib/collections';
import { docsPage, type DocsPageData } from './source.server';
import { docsUrl } from './table.js';
import { docsConfig } from '../../docs.config';

/** A docs page from its site's loader on the server (source.server.ts); undefined when the site has no such page. */
export const getDocsPage = createServerFn({ method: 'GET' })
  .validator((data: { site: SiteName; splat: string }) => data)
  .handler(({ data: { site, splat } }) => docsPage(site, splat));

/**
 * A docs route's loader, as Fumadocs' TanStack Start template loads a page: its data from the server,
 * then its compiled Markdown preloaded, so the server's HTML carries the whole text.
 */
export async function loadDocsPage(site: SiteName, splat: string) {
  // <site>/<lang?>/ask is the site's Ask AI page: a page of its own, in the layout of that language's
  // index page (its page tree, languages and tabs), so asking is one normal page, never an overlay.
  const ask = /(^|\/)ask$/.test(splat);
  const page = await getDocsPage({ data: { site, splat: ask ? splat.replace(/\/?ask$/, '') : splat } });
  if (!page) return undefined;
  if (!ask) await collections[site].getPage(page.path)?.preload();
  return { ...page, ask };
}

/** A site's Ask AI page, in a language: /docs/ask, /docs/es/ask. */
export const askUrl = (page: Pick<DocsPageData, 'site' | 'lang' | 'languages'>) =>
  `/${page.site}${page.lang !== page.languages[0] ? `/${page.lang}` : ''}/ask`;

/**
 * A docs page's head: title, description, the social image, canonical to itself, and every language the
 * page has its own text in as hreflang alternates (the default as x-default), so search engines and
 * their AI answers find each language's page.
 */
export function docsHead(page: (DocsPageData & { ask?: boolean }) | undefined) {
  if (!page) return {};
  const { origin } = page;
  // The Ask AI page: its own title, kept out of search (its answers are generated, not documents).
  if (page.ask) return { meta: [{ title: `Ask AI | ${docsConfig.titles[page.site]}` }, { name: 'robots', content: 'noindex' }] };
  const image = `${origin}/og${page.url}/image.webp`;
  return {
    meta: [
      { title: `${page.title} | ${docsConfig.titles[page.site]}` },
      { name: 'description', content: page.description },
      { property: 'og:site_name', content: docsConfig.titles[page.site] },
      { property: 'og:title', content: page.title },
      { property: 'og:description', content: page.description },
      { property: 'og:image', content: image },
      { name: 'twitter:card', content: 'summary_large_image' },
    ],
    links: [
      { rel: 'canonical', href: `${origin}${page.url}` },
      ...(page.langs.length > 1 ? [
        ...page.langs.map(lang => ({ rel: 'alternate', hrefLang: lang, href: `${origin}${docsUrl(page.site, page.slug, lang)}` })),
        { rel: 'alternate', hrefLang: 'x-default', href: `${origin}${docsUrl(page.site, page.slug)}` },
      ] : []),
      { rel: 'alternate', type: 'text/markdown', href: `${origin}${page.markdownUrl}` },
    ],
  };
}
