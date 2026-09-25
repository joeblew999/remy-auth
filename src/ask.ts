import { createServerFn } from '@tanstack/react-start';
import * as z from 'zod/mini';
import { locales } from '@joeblew999/remy-ui/locale';
import { answerQuestion } from './ask.server';

// Answers on the site page /docs/ask (.plans/docs-ai-sync.md): a question from the page's address,
// answered in the Worker by the AI Search instance remy-docs-pages, with the pages it used as citations.

export { askMaxLength, type AskResult } from './ask-limits';

/**
 * The page's search params: the question, whatever its length, so a long one can be explained rather
 * than refused. Zod Mini, as the shared search params use: the route's validateSearch runs in every
 * page's first load (TanStack keeps it out of the split chunks), and full Zod would add ~85 KB there.
 */
export const askSearchSchema = z.object({ q: z.catch(z.optional(z.string()), undefined) });

/** Asks on the server: the binding, the rate limit and the visitor's address live only there (ask.server.ts). */
export const askDocs = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string(), locale: z.enum(locales) }))
  .handler(({ data }) => answerQuestion(data.q, data.locale));
