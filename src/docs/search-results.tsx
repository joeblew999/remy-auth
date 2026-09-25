import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Empty, EmptyDescription, EmptyHeader, EmptyTitle } from '@joeblew999/remy-ui/components/empty';
import { DocsLink } from './content';
import type { DocsSearchHit, DocsSearchText } from './source.server';

// The docs search results, shared by the search page and the ask page (which shows them at once while
// the AI answer is on its way); the live search panel (search-panel.tsx) groups and marks them the same way.

/** The hits, each page with its matching sections under it; or why there are none. */
export function SearchResults({ locale, hits }: { locale: Locale; hits: DocsSearchHit[] }) {
  if (hits.length === 0) return <Empty data-docs-results="none" className="border">
    <EmptyHeader>
      <EmptyTitle>{m.search_none({}, { locale })}</EmptyTitle>
      <EmptyDescription>{m.search_none_hint({}, { locale })}</EmptyDescription>
    </EmptyHeader>
  </Empty>;
  return <ol data-docs-results={hits.length} lang="en" dir="ltr" className="flex flex-col gap-6">
    {byPage(hits).map(({ page, sections }) => <li key={page.url} className="flex flex-col gap-2">
      <DocsLink href={page.url} className="text-lg font-semibold tracking-tight underline-offset-4 hover:underline"><Text pieces={page.content} /></DocsLink>
      {sections.length > 0 && <ul className="flex flex-col gap-2 border-s ps-4">
        {sections.map((hit, index) => <li key={`${hit.url}-${index}`}>
          <DocsLink href={hit.url} className={hit.type === 'heading' ? 'font-medium underline-offset-4 hover:underline' : 'line-clamp-3 text-sm text-muted-foreground hover:text-foreground'}><Text pieces={hit.content} /></DocsLink>
        </li>)}
      </ul>}
    </li>)}
  </ol>;
}

/** The hits grouped by page: Fumadocs lists each page, then its matching sections. */
export const byPage = (hits: DocsSearchHit[]) => hits.reduce<{ page: DocsSearchHit; sections: DocsSearchHit[] }[]>((list, hit) => {
  if (hit.type === 'page' || list.length === 0) list.push({ page: hit, sections: [] });
  else list.at(-1)!.sections.push(hit);
  return list;
}, []);

/** A hit's text, the words that match the query marked. */
export function Text({ pieces }: { pieces: DocsSearchText }) {
  return pieces.map((piece, index) => (piece.mark ? <mark key={index}>{piece.text}</mark> : piece.text));
}
