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
  const page = await getDocsPage({ data: { site, splat } });
  if (page) await collections[site].getPage(page.path)?.preload();
  return page;
}

/**
 * A docs page's head: title, description, the social image, canonical to itself, and every language the
 * page has its own text in as hreflang alternates (the default as x-default), so search engines and
 * their AI answers find each language's page.
 */
export function docsHead(page: DocsPageData | undefined) {
  if (!page) return {};
  const { origin } = page;
  const image = `${origin}/og${page.url}/image.webp`;
  return {
    meta: [
      { title: `${page.title} | ${docsConfig.titles[page.site]}` },
      { name: 'description', content: page.description },
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
