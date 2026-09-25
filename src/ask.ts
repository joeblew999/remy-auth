import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { locales } from '@joeblew999/remy-ui/locale';
import { answerQuestion } from './ask.server';

// Answers on the app page /app/ask (.plans/docs-site.md, D5): a question from the page's address,
// answered in the Worker by the AI Search instance remy-docs, with the sections it used as citations.

export { askMaxLength, type AskResult } from './ask-limits';

/** The page's search params: the question, whatever its length, so a long one can be explained rather than refused. */
export const askSearchSchema = z.object({ q: z.string().optional().catch(undefined) });

/** Asks on the server: the binding, the rate limit and the visitor's address live only there (ask.server.ts). */
export const askDocs = createServerFn({ method: 'GET' })
  .validator(z.object({ q: z.string(), locale: z.enum(locales) }))
  .handler(({ data }) => answerQuestion(data.q, data.locale));
