import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod/mini';
import { docsSearch } from './source.server';

// Docs search (.plans/docs-site.md, "Docs search"): Fumadocs' own search, run in the Worker
// (source.server.ts); the page /docs/search gets the hits as data, so no index reaches the browser.

/** The longest query searched; the box stops there and the server cuts anything longer. */
export const searchMaxLength = 100;

/** The search page's params: the query, if any. Zod Mini, as the other routes' search params. */
export const docsSearchSchema = z.object({ q: z.catch(z.optional(z.string()), undefined) });

/** The query as searched: trimmed, at most searchMaxLength characters. */
export const searchQuery = (q = '') => q.trim().slice(0, searchMaxLength);

/** Searches on the server. */
export const searchDocs = createServerFn({ method: 'GET' })
  .validator((q: string) => searchQuery(q))
  .handler(({ data }) => docsSearch(data));
