import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { env } from 'cloudflare:workers';
import { logContext, requestIdHeader, writeLog } from '@joeblew999/remy-ui/worker';
import type { SiteName } from './lib/collections';
import { askMaxLength, type AskResult } from './ask-limits';
import { docsAnswerFolder, docsPage } from './docs/source.server';
import { docsObjectForKey } from './docs/table.js';
import { service } from './service';
import { docsConfig } from '../docs.config';

// The answer itself, in the Worker only (`.server.ts`: never in a browser bundle). Limits come
// first and cost nothing: every submitted question counts against the visitor's rate limit (10 a
// minute per IP, wrangler.jsonc), then a question over askMaxLength is explained, not sent. Only
// then does AI Search retrieve at most five chunks and write a short answer, from its cache when
// the same question was asked recently. Any failure is "no answer", never a blank page. This Worker
// never logs the question; the AI Gateway does keep every model call, question included, for 7 days:
// its logs are our record of cost per call (decided 2026-09-25, .plans/observability.md).

/** The default Workers AI model of AI Search, named so a change of default does not change our answers unseen. */
const model = '@cf/meta/llama-3.3-70b-instruct-fp8-fast';

/** The model's word for "the excerpts do not answer this": the route then says so itself, with no sources. */
const noAnswer = 'NO_ANSWER';

const instructions = `You answer questions about ${docsConfig.product} from its documentation excerpts only. ` +
  'Answer in at most three short sentences, in the language of the question, as plain text without Markdown. ' +
  `If the excerpts do not answer the question, reply with exactly ${noAnswer} and nothing else.`;

export const answerQuestion = createServerOnlyFn(async (site: SiteName, q: string, locale: string): Promise<AskResult> => {
  const question = q.trim();
  if (!question) return { status: 'empty' };
  const request = getRequest();
  const started = Date.now();
  // One `ask` event per question (mise cf:events -- ask): its outcome, how long the model call took,
  // how many sources it cited and the page's language. Never the question itself.
  const log = (outcome: string, fields: Record<string, unknown> = {}, level: 'info' | 'error' = 'info') =>
    writeLog({ ...logContext(service, env, request.headers.get(requestIdHeader) ?? '', 'GET'), event: 'ask', level, outcome, site, locale, ...fields });
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
      // Only this site's files in the page's language (docsAnswerFolder): its own translation, else its default language.
      ai_search_options: { retrieval: { max_num_results: 5, filters: { folder: docsAnswerFolder(site, locale) } }, cache: { enabled: true } },
    });
    const answer = response.choices[0]?.message.content?.trim();
    // Each cited page or section once, in the order AI Search ranked them, on the page's language frame.
    const cited = await Promise.all(response.chunks.map(chunk => citation(chunk, locale)));
    const citations = [...new Map(cited.flatMap(item => (item ? [[item.url, item] as const] : []))).values()];
    const answered = Boolean(answer) && !answer!.includes(noAnswer) && citations.length > 0;
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
 * language from R2 (key <site>/<lang>/<slug>.md: src/docs/table.js), and its chunks carry no metadata,
 * so the key names the site, page and language. A page opens in its own language's URL. The citation is that page, or, when the chunk's text holds a heading the
 * page lists in "On this page", that section (translations keep the English heading ids). The title
 * is the one the opened page shows. Chunks of anything else are not cited.
 */
async function citation(chunk: AiSearchSearchResponse['chunks'][number], locale: string) {
  const object = docsObjectForKey(chunk.item.key);
  if (!object) return undefined;
  const splat = (lang: string) => [lang === 'en' ? '' : lang, object.row.slug].filter(Boolean).join('/');
  const target = object.lang === 'en' ? locale : object.lang;
  const [source, page] = await Promise.all([docsPage(object.row.site, splat(object.lang)), docsPage(object.row.site, splat(target))]);
  if (!source || !page) return undefined;
  const id = chunk.text.split('\n').map(headingText).flatMap(text => source.headings.filter(item => item.text === text)).at(0)?.id;
  const heading = page.headings.find(item => item.id === id);
  return heading ? { url: `${page.url}#${heading.id}`, title: `${page.title}: ${heading.text}` } : { url: page.url, title: page.title };
}
