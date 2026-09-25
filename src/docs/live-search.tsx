import { useState, type ReactNode } from 'react';
import { Link } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@tanstack/react-pacer/debouncer';
import { SparklesIcon } from 'lucide-react';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { localizeHref } from '@joeblew999/remy-ui/runtime';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Input } from '@joeblew999/remy-ui/components/input';
import { Spinner } from '@joeblew999/remy-ui/components/spinner';
import { askDocs, askMaxLength } from '../ask';
import { askPath, docsSearchPath } from '../paths';
import { AskAnswer } from './ask-answer';
import { searchDocs, searchQuery } from './search';
import { SearchResults } from './search-results';
import { docsSearchInputId } from './search-id';


// Search and ask at the top of the docs area (owner, 2026-09-25: "Make it at the top of the docs area and
// then just update below"). As the visitor types, the docs search's results replace the page below
// (TanStack Query over searchDocs, debounced with TanStack Pacer); clearing the box brings the page back.
// "Ask AI" (or Enter) asks once and shows the answer there too: a model call only when asked. Without
// JavaScript it is a plain form: Search goes to /docs/search, Ask AI to /docs/ask (formaction).
export function DocsLiveSearch({ locale, children }: { locale: Locale; children: ReactNode }) {
  const o = { locale };
  const [input, setInput] = useState('');
  const [asked, setAsked] = useState<string>();
  const [query] = useDebouncedValue(searchQuery(input), { wait: 150 });
  const hits = useQuery({
    queryKey: ['docs-search', query, locale],
    queryFn: () => searchDocs({ data: { q: query, locale } }),
    enabled: query !== '',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
  const answer = useQuery({
    queryKey: ['docs-ask', asked, locale],
    queryFn: () => askDocs({ data: { q: asked!, locale } }),
    enabled: asked !== undefined,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  const question = input.trim();
  return <div className="flex flex-col gap-6">
    <form method="get" action={localizeHref(docsSearchPath, { locale })} role="search" className="flex gap-2" data-docs-live
      onSubmit={event => { event.preventDefault(); if (question) setAsked(question.slice(0, askMaxLength)); }}>
      <Input id={docsSearchInputId} name="q" type="search" dir="auto" value={input} maxLength={askMaxLength}
        onChange={event => { setInput(event.target.value); setAsked(undefined); }}
        placeholder={m.search_panel_placeholder({}, o)} aria-label={m.search_label({}, o)} />
      {/* Ask AI first: Enter presses it. Search's results are already on screen with JavaScript. */}
      <Button type="submit" formAction={localizeHref(askPath, { locale })} data-ask-ai><SparklesIcon />{m.ask_submit({}, o)}</Button>
      <Button type="submit" variant="outline" formAction={localizeHref(docsSearchPath, { locale })}
        onClick={event => { event.preventDefault(); }}>{m.search_submit({}, o)}</Button>
    </form>
    {question === '' ? children : <div className="flex flex-col gap-6" data-docs-live-results>
      {asked !== undefined && <div className="flex flex-col gap-3 rounded-lg border p-4">
        {answer.isPending
          ? <p data-asking className="flex items-center gap-2 text-muted-foreground"><Spinner />{m.ask_pending({}, o)}</p>
          : <AskAnswer locale={locale} result={answer.data ?? { status: 'no-answer' }} />}
        <Link to="/docs/ask" search={{ q: asked }} className="text-sm font-medium text-primary underline underline-offset-4">{m.search_panel_open({}, o)}</Link>
      </div>}
      {query !== '' && hits.data && <SearchResults locale={locale} hits={hits.data.slice(0, 20)} />}
    </div>}
  </div>;
}
