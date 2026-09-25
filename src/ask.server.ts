import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { logContext, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { askMaxLength, type AskResult } from './ask-limits';
import { docsPage } from './docs/source.server';
import { docsLocale, docsObjectForKey, docsPath } from './docs/table.js';
import { service } from './service';

// The answer itself, in the Worker only (`.server.ts`: never in a browser bundle). Limits come
// first and cost nothing: every submitted question counts against the visitor's rate limit (10 a
// minute per IP, wrangler.jsonc), then a question over askMaxLength is explained, not sent. Only
// then does AI Search retrieve at most five chunks and write a short answer, from its cache when
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
  const started = Date.now();
  // One `ask` event per question (mise cf:events -- ask): its outcome, how long the model call took,
  // how many sources it cited and the page's language. Never the question itself.
  const log = (outcome: string, fields: Record<string, unknown> = {}, level: 'info' | 'error' = 'info') =>
    writeLog({ ...logContext(service, env, request.headers.get(requestIdHeader) ?? '', 'GET'), event: 'ask', level, outcome, locale, ...fields });
  const { success } = await env.ASK_LIMIT.limit({ key: request.headers.get('CF-Connecting-IP') ?? 'unknown' });
  if (!success) { log('rate-limited'); return { status: 'rate-limited' }; }
  if (question.length > askMaxLength) { log('too-long', { length: question.length }); return { status: 'too-long', length: question.length }; }
  // The emergency stop (mise docs:answers:off): the secret ASK_PAUSED set means no model call at all.
  if ((env as { ASK_PAUSED?: string }).ASK_PAUSED) { log('paused'); return { status: 'no-answer' }; }
  try {
    const response = await env.DOCS_SEARCH.chatCompletions({
      model,
      max_tokens: 300,
      messages: [{ role: 'system', content: instructions }, { role: 'user', content: question }],
      ai_search_options: { retrieval: { max_num_results: 5 }, cache: { enabled: true } },
    });
    const answer = response.choices[0]?.message.content?.trim();
    // Each cited page or section once, in the order AI Search ranked them, on the page's language frame.
    const cited = await Promise.all(response.chunks.map(chunk => citation(chunk, locale)));
    const citations = [...new Map(cited.flatMap(item => (item ? [[item.url, item] as const] : []))).values()];
    const answered = Boolean(answer) && citations.length > 0;
    log(answered ? 'answered' : 'no-answer', { durationMs: Date.now() - started, chunks: response.chunks.length, citations: citations.length });
    return answered ? { status: 'answered', answer: answer!, citations } : { status: 'no-answer' };
  } catch (error) {
    // The error's message says what failed (binding, AI Search, model); it never contains the question.
    log('failed', { durationMs: Date.now() - started, error: error instanceof Error ? `${error.name}: ${error.message}`.slice(0, 300) : 'unknown' }, 'error');
    return { status: 'no-answer' };
  }
});

/** A heading line's text as the page shows it: no explicit [#id], link targets, code or emphasis marks, no Markdown escapes. */
const headingText = (line: string) => line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/)?.[1]
  .replace(/\s*\[#[^\]]+\]$/, '').replace(/\[([^\]]*)\]\([^)]*\)/g, '$1').replace(/[`*_]/g, '').replace(/\\([!-/:-@[-`{-~])/g, '$1').replace(/\s+/g, ' ').trim();

/**
 * A chunk as a citation. The instance remy-docs-pages reads one Markdown object per docs page and
 * language from R2 (key <slug>.md, index.md for /docs, a translation <locale>/<slug>.md:
 * src/docs/table.js), and its chunks carry no metadata, so the key names the page and its language.
 * An English page opens in the visitor's frame language, a translation in its own
 * (/<locale>/docs/<slug>). The citation is that page, or, when the chunk's text holds a heading the
 * page lists in "On this page", that section (translations keep the English heading ids). The title
 * is the one the opened page shows. Chunks of anything else are not cited.
 */
async function citation(chunk: AiSearchSearchResponse['chunks'][number], locale: Locale) {
  const object = docsObjectForKey(chunk.item.key);
  if (!object) return undefined;
  const target = object.locale === docsLocale ? locale : object.locale;
  const [source, page] = await Promise.all([docsPage(object.row.slug, object.locale), docsPage(object.row.slug, target)]);
  if (!source || !page) return undefined;
  const url = `/${target}${docsPath(page.slug)}`;
  const id = chunk.text.split('\n').map(headingText).flatMap(text => source.headings.filter(item => item.text === text)).at(0)?.id;
  const heading = page.headings.find(item => item.id === id);
  return heading ? { url: `${url}#${heading.id}`, title: `${page.title}: ${heading.text}` } : { url, title: page.title };
}
