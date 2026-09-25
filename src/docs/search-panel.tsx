import { useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import { useDebouncedValue } from '@tanstack/react-pacer/debouncer';
import { SparklesIcon } from 'lucide-react';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Command, CommandDialog, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from '@joeblew999/remy-ui/components/command';
import { Spinner } from '@joeblew999/remy-ui/components/spinner';
import { askDocs, askMaxLength } from '../ask';
import { AskAnswer } from './ask-answer';
import { DocsLink } from './content';
import { searchDocs, searchMaxLength, searchQuery } from './search';
import { byPage, Text } from './search-results';
import type { DocsSearchHit } from './source.server';

// The live search panel (.plans/docs-site.md, "Live search panel"): shadcn's Command in its dialog,
// opened from the site header (header-link.tsx), which loads this file only when the panel first opens.
// Docs search results come back as the visitor types (TanStack Query over the searchDocs server
// function, debounced with TanStack Pacer); the AI answer is asked only when the visitor chooses
// "Ask AI", never while typing, as each question is a model call. The pages /docs/search and /docs/ask
// stay the way without JavaScript.

export default function SearchPanel({ locale, open, onOpenChange }: { locale: Locale; open: boolean; onOpenChange: (open: boolean) => void }) {
  const o = { locale };
  const [input, setInput] = useState('');
  const [asked, setAsked] = useState<string>();
  const [query] = useDebouncedValue(searchQuery(input), { wait: 150 });
  const hits = useQuery({
    queryKey: ['docs-search', query],
    queryFn: () => searchDocs({ data: query }),
    enabled: query !== '',
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
  });
  // Kept for the visit, as the answer page keeps its answers: asking the same question again is no new call.
  const answer = useQuery({
    queryKey: ['docs-ask', asked, locale],
    queryFn: () => askDocs({ data: { q: asked!, locale } }),
    enabled: asked !== undefined,
    staleTime: Infinity,
    gcTime: 30 * 60 * 1000,
    retry: false,
  });
  const question = input.trim();
  const close = () => onOpenChange(false);
  return <CommandDialog open={open} onOpenChange={onOpenChange} title={m.search_title({}, o)} description={m.search_description({}, o)} className="sm:max-w-xl">
    <Command shouldFilter={false} data-docs-panel>
      <CommandInput value={input} onValueChange={value => { setInput(value); setAsked(undefined); }} placeholder={m.search_panel_placeholder({}, o)} maxLength={Math.max(searchMaxLength, askMaxLength)} dir="auto" />
      <CommandList>
        {query !== '' && hits.data?.length === 0 && <CommandItem disabled value="none" data-docs-results="none">{m.search_none({}, o)}</CommandItem>}
        {query !== '' && byPage((hits.data ?? []).slice(0, 12)).map(({ page, sections }) =>
          // Headed by its page; the page itself is an item only when none of its sections matched.
          <CommandGroup key={page.url} heading={<span lang="en" dir="ltr">{page.content.map(piece => piece.text).join('')}</span>} data-docs-results={sections.length || 1}>
            {(sections.length ? sections : [page]).map((hit, index) => <HitItem key={`${hit.url}-${index}`} hit={hit} value={`${hit.url}-${index}`} onNavigate={close} />)}
          </CommandGroup>)}
        {question !== '' && <>
          <CommandSeparator />
          <CommandGroup heading={m.ask_title({}, o)}>
            <CommandItem value="ask-ai" data-ask-ai onSelect={() => setAsked(question)}>
              <SparklesIcon />
              <span className="truncate" dir="auto">{m.search_panel_ask({ query: question }, o)}</span>
            </CommandItem>
          </CommandGroup>
        </>}
      </CommandList>
      {asked !== undefined && <div className="flex max-h-80 flex-col gap-3 overflow-y-auto border-t p-3 [&_h2]:text-base [&_h3]:text-sm">
        {answer.isPending
          ? <p data-asking className="flex items-center gap-2 text-muted-foreground"><Spinner />{m.ask_pending({}, o)}</p>
          : <AskAnswer locale={locale} result={answer.data ?? { status: 'no-answer' }} />}
        <Link to="/docs/ask" search={{ q: asked }} onClick={close} data-ask-page className="text-sm font-medium text-primary underline underline-offset-4">{m.search_panel_open({}, o)}</Link>
      </div>}
    </Command>
  </CommandDialog>;
}

/**
 * One hit: a router link to its page or heading. A click follows the link itself (so a new tab works
 * too); Enter on the selected item clicks the same link.
 */
function HitItem({ hit, value, onNavigate }: { hit: DocsSearchHit; value: string; onNavigate: () => void }) {
  const link = useRef<HTMLAnchorElement>(null);
  return <CommandItem value={value} onSelect={() => link.current?.click()} className="p-0">
    <DocsLink ref={link} href={hit.url} tabIndex={-1} lang="en" dir="ltr"
      className={hit.type === 'text' ? 'line-clamp-2 w-full px-2 py-1.5 text-muted-foreground' : 'w-full px-2 py-1.5 font-medium'}
      onClick={event => {
        event.stopPropagation();
        if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) onNavigate();
      }}>
      <Text pieces={hit.content} />
    </DocsLink>
  </CommandItem>;
}
