import { createFileRoute } from '@tanstack/react-router';
import { getLocale, type Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AppShell } from '@joeblew999/remy-ui/app-pages';
import { Intro } from '@joeblew999/remy-ui/shell';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { Alert, AlertDescription } from '@joeblew999/remy-ui/components/alert';
import { askDocs, askMaxLength, askSearchSchema, type AskResult } from '../ask';
import { AskForm } from '../docs/ask-form';
import { getDocsNav } from '../docs/page';
import { DocsNav } from '../docs/view';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// Answers (.plans/docs-site.md, decision 5): an app page, rendered on the server from the question in
// its address, so it is readable without JavaScript. Per request and private: noindex (pageHead, an
// app path) and never stored by a cache.
export const Route = createFileRoute('/app/ask')({
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
  head: () => pageHead({ path: '/app/ask', title: locale => m.ask_title({}, { locale }), description: locale => m.ask_description({}, { locale }) }),
  component: Ask,
  ...problemPages,
});

function Ask() {
  const locale = getLocale();
  const { question, result, nav } = Route.useLoaderData();
  return <AppShell locale={locale} path="/app/ask" preferred={usePreferred()}>
    <section className="flex max-w-3xl flex-col gap-6">
      <Intro locale={locale} title={m.ask_title({}, { locale })} intro={m.ask_intro({}, { locale })} backTo="/app" />
      <AskForm locale={locale} question={question.slice(0, askMaxLength)} />
      <AskAnswer locale={locale} result={result} />
      {result.status !== 'empty' && result.status !== 'answered' && <DocsNav locale={locale} nav={nav} />}
    </section>
  </AppShell>;
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
