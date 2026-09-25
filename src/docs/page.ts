import { notFound } from '@tanstack/react-router';
import { createServerFn } from '@tanstack/react-start';
import type { Root } from 'hast';
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

/** A docs page from the server (source.server.ts), its article as data; unknown slugs are 404s. */
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
 * A docs route's loader: the whole page from the server, so the server's HTML carries the whole text
 * (complete without JavaScript), hydration renders the same tree from the loader data, and a client
 * navigation fetches the next page's data, never its code.
 */
export function loadDocsPage(slug: string) {
  return getDocsPage({ data: slug });
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
