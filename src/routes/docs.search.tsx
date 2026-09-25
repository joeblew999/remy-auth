import { createFileRoute } from '@tanstack/react-router';
import { getLocale, type Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SiteShell } from '@joeblew999/remy-ui/shell';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@joeblew999/remy-ui/components/empty';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import { DocsLink } from '../docs/content';
import { DocsNav } from '../docs/nav';
import { getDocsNav } from '../docs/page';
import { docsSearchSchema, searchDocs, searchQuery } from '../docs/search';
import { SearchForm } from '../docs/search-form';
import type { DocsSearchHit, DocsSearchText } from '../docs/source.server';
import { docsSearchPath } from '../paths';
import { usePreferred } from '../preferred';
import { problemPages } from '../problem';

// Docs search (.plans/docs-site.md, "Docs search"): a site page, rendered on the server from the
// query in its address with Fumadocs' search (src/docs/source.server.ts), so it works without
// JavaScript and ships no index. The empty page is an ordinary site page; a page of results carries
// noindex and no canonical, as search results are not for Google.
export const Route = createFileRoute('/docs/search')({
  validateSearch: docsSearchSchema,
  loaderDeps: ({ search }) => ({ q: searchQuery(search.q) }),
  loader: async ({ deps }) => {
    const [hits, nav] = await Promise.all([deps.q ? searchDocs({ data: deps.q }) : [], getDocsNav()]);
    return { query: deps.q, hits, nav };
  },
  head: ({ loaderData }) => {
    const title = (locale: Locale) => m.search_title({}, { locale });
    const description = (locale: Locale) => m.search_description({}, { locale });
    if (!loaderData?.query) return pageHead({ path: docsSearchPath, title, description });
    const locale = getLocale();
    return { meta: [{ title: `${loaderData.query} · ${title(locale)} | Remy` }, { name: 'description', content: description(locale) }, { name: 'robots', content: 'noindex' }] };
  },
  component: DocsSearch,
  ...problemPages,
});

function DocsSearch() {
  const locale = getLocale();
  const { query, hits, nav } = Route.useLoaderData();
  return <SiteShell locale={locale} path={docsSearchPath} preferred={usePreferred()}>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
      <section className="flex min-w-0 max-w-3xl flex-col gap-6 lg:col-start-2 lg:row-start-1">
        <h1 className="scroll-m-20 text-4xl font-semibold tracking-tight text-balance">{m.search_title({}, { locale })}</h1>
        <SearchForm locale={locale} query={query} />
        {query && <Results locale={locale} hits={hits} />}
      </section>
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <Separator className="lg:hidden" />
        <DocsNav locale={locale} nav={nav} />
      </div>
    </div>
  </SiteShell>;
}

/** The hits, each page with its matching sections under it; or why there are none. */
function Results({ locale, hits }: { locale: Locale; hits: DocsSearchHit[] }) {
  if (hits.length === 0) return <Empty data-docs-results="none" className="border">
    <EmptyHeader>
      <EmptyTitle>{m.search_none({}, { locale })}</EmptyTitle>
      <EmptyDescription>{m.search_none_hint({}, { locale })}</EmptyDescription>
    </EmptyHeader>
  </Empty>;
  const pages = hits.reduce<{ page: DocsSearchHit; sections: DocsSearchHit[] }[]>((list, hit) => {
    if (hit.type === 'page' || list.length === 0) list.push({ page: hit, sections: [] });
    else list.at(-1)!.sections.push(hit);
    return list;
  }, []);
  return <ol data-docs-results={hits.length} lang="en" dir="ltr" className="flex flex-col gap-6">
    {pages.map(({ page, sections }) => <li key={page.url} className="flex flex-col gap-2">
      <DocsLink href={page.url} className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"><Text pieces={page.content} /></DocsLink>
      {sections.length > 0 && <ul className="flex flex-col gap-2 border-s ps-4">
        {sections.map((hit, index) => <li key={`${hit.url}-${index}`}>
          <DocsLink href={hit.url} className={hit.type === 'heading' ? 'font-medium underline-offset-4 hover:underline' : 'line-clamp-3 text-sm text-muted-foreground hover:text-foreground'}><Text pieces={hit.content} /></DocsLink>
        </li>)}
      </ul>}
    </li>)}
  </ol>;
}

/** A hit's text, the words that match the query marked. */
function Text({ pieces }: { pieces: DocsSearchText }) {
  return pieces.map((piece, index) => (piece.mark ? <mark key={index}>{piece.text}</mark> : piece.text));
}
