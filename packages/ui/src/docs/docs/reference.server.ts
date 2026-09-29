import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { reference } from '../lib/source';

/** An API reference page at /reference/<operation> (the first operation for /reference), or undefined. */
export const referencePage = createServerOnlyFn(async (splat: string) => {
  const slugs = splat.split('/').filter(Boolean);
  const page = slugs.length ? reference.getPage(slugs) : reference.getPages()[0];
  if (!page) return undefined;
  return {
    title: page.data.title ?? '',
    description: page.data.description ?? '',
    origin: new URL(getRequest().url).origin,
    url: page.url,
    toc: page.data.toc.map(entry => ({ url: entry.url, depth: entry.depth, title: String(entry.title) })),
    // fumadocs-openapi's page props (the bundled spec is plain JSON), as JSON text for Start's serializer.
    props: JSON.stringify(page.data.getOpenAPIPageProps()),
    pageTree: await reference.serializePageTree(reference.getPageTree()),
  };
});

/** Every reference page's URL, for the sitemap. */
export const referenceUrls = createServerOnlyFn(() => reference.getPages().map(page => page.url));
