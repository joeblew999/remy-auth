import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { logContext, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { askMaxLength, type AskResult } from './ask-limits';
import { docsLocale } from './docs/table.js';
import { service } from './service';

// The answer itself, in the Worker only (`.server.ts`: never in a browser bundle). Limits come
// first and cost nothing: every submitted question counts against the visitor's rate limit (10 a
// minute per IP, wrangler.jsonc), then a question over askMaxLength is explained, not sent. Only
// then does AI Search retrieve at most five sections and write a short answer, from its cache when
// the same question was asked recently. Any failure is "no answer", never a blank page. This Worker
// never logs the question; the AI Gateway does keep every model call, question included, for 7 days:
// its logs are our record of cost per call (decided 2026-09-25, .plans/observability.md).

/** The default Workers AI model of AI Search, named so a change of default does not change our answers unseen. */
const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

const instructions = 'You answer questions about the Remy project from its documentation excerpts only. ' +
  'Answer in at most three short sentences, in the language of the question, as plain text without Markdown. ' +
  'If the excerpts do not answer the question, say that the documentation does not cover it.';

export const answerQuestion = createServerOnlyFn(async (q: string, locale: Locale): Promise<AskResult> => {
  const question = q.trim();
  if (!question) return { status: 'empty' };
  const request = getRequest();
  const { success } = await env.ASK_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
  if (!success) return { status: 'rate-limited' };
  if (question.length > askMaxLength) return { status: 'too-long', length: question.length };
  // The emergency stop (mise docs:answers:off): the secret ASK_PAUSED set means no model call at all.
  if ((env as { ASK_PAUSED?: string }).ASK_PAUSED) {
    writeLog({ ...logContext(service, env, request.headers.get(requestIdHeader) ?? '', 'GET'), event: 'ask_paused', level: 'info' });
    return { status: 'no-answer' };
  }
  try {
    const response = await env.DOCS_SEARCH.chatCompletions({
      model,
      max_tokens: 300,
      messages: [{ role: 'system', content: instructions }, { role: 'user', content: question }],
      ai_search_options: { retrieval: { max_num_results: 5 }, cache: { enabled: true } },
    });
    const answer = response.choices[0]?.message.content?.trim();
    // Each cited section once, in the order AI Search ranked them, on the page's language frame.
    const citations = [...new Map(response.chunks.flatMap(chunk => {
      const { url, title } = chunk.item.metadata ?? {};
      return typeof url === 'string' && typeof title === 'string' && url.startsWith(`/${docsLocale}/docs`)
        ? [[url, { url: `/${locale}${url.slice(docsLocale.length + 1)}`, title }] as const] : [];
    })).values()];
    return answer && citations.length > 0 ? { status: 'answered', answer, citations } : { status: 'no-answer' };
  } catch (error) {
    writeLog({ ...logContext(service, env, request.headers.get(requestIdHeader) ?? '', 'GET'), event: 'ask_failed', level: 'error',
      error: error instanceof Error ? error.name : 'unknown' });
    return { status: 'no-answer' };
  }
});
