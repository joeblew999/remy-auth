import { Await, createFileRoute } from '@tanstack/react-router';
import { getLocale, type Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SiteShell } from '@joeblew999/remy-ui/shell';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import { Spinner } from '@joeblew999/remy-ui/components/spinner';
import { askDocs, askMaxLength, askSearchSchema } from '../ask';
import { AskAnswer } from '../docs/ask-answer';
import { AskForm } from '../docs/ask-form';
import { DocsNav } from '../docs/nav';
import { getDocsNav } from '../docs/page';
import { searchDocs, searchQuery } from '../docs/search';
import { SearchResults } from '../docs/search-results';
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
  // The docs search's hits come at once (Fumadocs, about 0.2 s); the AI answer takes seconds (AI Search's
  // retrieval, then the model). In the browser the answer is deferred (TanStack's deferred data: the
  // page shows the hits and fills the answer in); on the server it is awaited, so the page is complete
  // without JavaScript.
  loader: async ({ deps }) => {
    const answer = askDocs({ data: { q: deps.q, locale: getLocale() } });
    const query = searchQuery(deps.q);
    const [hits, nav] = await Promise.all([query ? searchDocs({ data: { q: query, locale: getLocale() } }) : [], getDocsNav({ data: getLocale() })]);
    return { question: deps.q, hits, nav, result: import.meta.env.SSR ? await answer : answer };
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
  const { question, hits, result, nav } = Route.useLoaderData();
  return <SiteShell locale={locale} path={askPath} preferred={usePreferred()}>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
      <section className="flex min-w-0 max-w-3xl flex-col gap-6 lg:col-start-2 lg:row-start-1">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">{m.ask_title({}, { locale })}</h1>
        <p className="text-lg leading-relaxed text-muted-foreground">{m.ask_intro({}, { locale })}</p>
        <AskForm locale={locale} question={question.slice(0, askMaxLength)} />
        {result instanceof Promise
          ? <Await promise={result} fallback={<p data-asking className="flex items-center gap-2 text-muted-foreground"><Spinner />{m.ask_pending({}, { locale })}</p>}>
              {resolved => <AskAnswer locale={locale} result={resolved} />}
            </Await>
          : <AskAnswer locale={locale} result={result} />}
        {question.trim() && hits.length > 0 && <SearchResults locale={locale} hits={hits.slice(0, 8)} />}
      </section>
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <Separator className="lg:hidden" />
        <DocsNav locale={locale} nav={nav} />
      </div>
    </div>
  </SiteShell>;
}
