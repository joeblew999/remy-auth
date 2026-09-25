import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import { getUrlOrigin } from '@joeblew999/remy-ui/runtime';
import { docsNav, docsPage } from './source.server';
import { docsContent } from './loader';
import { docsLocale, docsPath } from './table.js';

/** A docs page's metadata from the server (source.server.ts); unknown slugs are 404s. */
export const getDocsPage = createServerFn({ method: 'GET' })
  .validator((slug: string) => slug)
  .handler(async ({ data: slug }) => {
    const page = await docsPage(slug);
    if (!page) throw notFound();
    return page;
  });

/** The docs navigation alone, for pages outside the docs (the answer page's way back). */
export const getDocsNav = createServerFn({ method: 'GET' }).handler(() => docsNav());

/**
 * A docs route's loader: the page's metadata, and its compiled content loaded before rendering, so
 * the server's HTML carries the whole text (complete without JavaScript) and a client navigation
 * renders at once.
 */
export async function loadDocsPage(slug: string) {
  const page = await getDocsPage({ data: slug });
  await docsContent.preload(page.file);
  return page;
}

/**
 * A docs page's head: English only, so every language's URL names the /en page as canonical and
 * there are no hreflang alternates (.plans/docs-site.md, decision 3).
 */
export function docsHead(page: { slug: string; title: string; description: string } | undefined) {
  if (!page) return {};
  return {
    meta: [{ title: `${page.title} | Remy` }, { name: 'description', content: page.description }],
    links: [{ rel: 'canonical', href: `${getUrlOrigin()}/${docsLocale}${docsPath(page.slug)}` }],
  };
}
