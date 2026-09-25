import { createFileRoute } from '@tanstack/react-router';
import { getLocale, type Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SiteShell } from '@joeblew999/remy-ui/shell';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { Alert, AlertDescription } from '@joeblew999/remy-ui/components/alert';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import { askDocs, askMaxLength, askSearchSchema, type AskResult } from '../ask';
import { AskForm } from '../docs/ask-form';
import { DocsNav } from '../docs/nav';
import { getDocsNav } from '../docs/page';
import { askPath } from '../paths';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// Answers (.plans/docs-ai-sync.md, "Ask from the site"): a site page beside the docs search, rendered
// on the server from the question in its address, so it works without JavaScript and the visitor stays
// in the site. As the search page: the empty page is an ordinary site page; a page with a question
// carries noindex and no canonical, as answers are not for Google. Every response is private and never
// stored by an HTTP cache.
export const Route = createFileRoute('/docs/ask')({
  validateSearch: askSearchSchema,
  loaderDeps: ({ search }) => ({ q: search.q ?? '' }),
  loader: async ({ deps }) => {
    const [result, nav] = await Promise.all([askDocs({ data: { q: deps.q, locale: getLocale() } }), getDocsNav()]);
    return { question: deps.q, result, nav };
  },
  // The router keeps each question's answer for the visit (keyed by q, loaderDeps), so going back from a
  // cited docs page shows it again without asking again: every question asked is a model call. The
  // response itself stays private and unstored by HTTP caches (headers below).
  staleTime: Infinity,
  gcTime: 30 * 60 * 1000,
  headers: () => ({ 'Cache-Control': 'private, no-store' }),
  head: ({ loaderData }) => {
    const title = (locale: Locale) => m.ask_title({}, { locale });
    const description = (locale: Locale) => m.ask_description({}, { locale });
    const question = loaderData?.question.trim().slice(0, askMaxLength);
    if (!question) return pageHead({ path: askPath, title, description });
    const locale = getLocale();
    return { meta: [{ title: `${question} · ${title(locale)} | Remy` }, { name: 'description', content: description(locale) }, { name: 'robots', content: 'noindex' }] };
  },
  component: Ask,
  ...problemPages,
});

function Ask() {
  const locale = getLocale();
  const { question, result, nav } = Route.useLoaderData();
  return <SiteShell locale={locale} path={askPath} preferred={usePreferred()}>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
      <section className="flex min-w-0 max-w-3xl flex-col gap-6 lg:col-start-2 lg:row-start-1">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">{m.ask_title({}, { locale })}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{m.ask_intro({}, { locale })}</p>
        <AskForm locale={locale} question={question.slice(0, askMaxLength)} />
        <AskAnswer locale={locale} result={result} />
      </section>
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <Separator className="lg:hidden" />
        <DocsNav locale={locale} nav={nav} />
      </div>
    </div>
  </SiteShell>;
}

/** The answer and its numbered sources, or why there is none; `data-ask` names the outcome for the checks. */
function AskAnswer({ locale, result }: { locale: Locale; result: AskResult }) {
  const o = { locale };
  if (result.status === 'empty') return null;
  if (result.status !== 'answered') {
    const text = result.status === 'too-long' ? m.ask_too_long({ length: result.length, max: askMaxLength }, o)
      : result.status === 'rate-limited' ? m.ask_rate_limited({}, o) : m.ask_no_answer({}, o);
    return <Alert data-ask={result.status} variant={result.status === 'no-answer' ? 'default' : 'destructive'}><AlertDescription>{text}</AlertDescription></Alert>;
  }
  return <div data-ask="answered" className="flex flex-col gap-4">
    <h2 className="text-2xl font-semibold tracking-tight">{m.ask_answer({}, o)}</h2>
    <div dir="auto" className="flex flex-col gap-3 leading-7">{result.answer.split(/\n{2,}/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}</div>
    <h3 className="text-lg font-semibold tracking-tight">{m.ask_sources({}, o)}</h3>
    <ol className="ms-6 list-decimal [&>li]:mt-2">
      {result.citations.map(citation => <li key={citation.url}>
        <a data-citation className="font-medium text-primary underline underline-offset-4" lang="en" href={citation.url}>{citation.title}</a>
      </li>)}
    </ol>
  </div>;
}
