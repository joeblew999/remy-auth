import { useMemo } from 'react';
import { Fragment, jsx, jsxs } from 'react/jsx-runtime';
import { toJsxRuntime } from 'hast-util-to-jsx-runtime';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SiteShell } from '@joeblew999/remy-ui/shell';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import type { DocsPageData } from './source.server';
import { docsComponents } from './content';
import { DocsNav } from './nav';
import { DocsLiveSearch } from './live-search';
import { branch, docsPath, repository } from './table.js';

// A docs page (.plans/docs-site.md, decision 4): the search-and-ask box on top, then the text, "On this page"
// and the docs navigation; no hero, no cards. It is a site page in SiteShell, complete in the server's
// HTML. The article is in the visitor's language when it has a translation, else English (lang="en",
// left to right) inside a frame in the visitor's language (.plans/docs-site.md, "Docs translations"). Its text comes
// as data, the Markdown's finished tree from the server (source.server.ts), rendered with
// hast-util-to-jsx-runtime as Fumadocs renders server-compiled Markdown: no page ships as code.

export function DocsView({ locale, page, preferred }: { locale: Locale; page: DocsPageData; preferred?: Locale }) {
  const o = { locale };
  const path = docsPath(page.slug);
  // The text's language; English inside another language's frame reads left to right.
  const text = { lang: page.lang, dir: page.lang === locale ? undefined : 'ltr' } as const;
  const content = useMemo(() => toJsxRuntime(page.tree, { Fragment, jsx, jsxs, components: docsComponents }), [page.tree]);
  return <SiteShell locale={locale} path={path} preferred={preferred}>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
      <div className="min-w-0 max-w-3xl lg:col-start-2 lg:row-start-1">
        <DocsLiveSearch locale={locale}>
          <article {...text} className="break-words" data-docs-article={page.slug}>
            {/* The tree is in the loader data on the server, at hydration and on navigations, so the
                article renders at once and hydration keeps the server's text. */}
            {content}
            <p className="mt-10 text-sm text-muted-foreground">
              <a className="underline underline-offset-4" href={`${repository}/blob/${branch}/${page.file}`}>{m.docs_source({}, o)}</a>
            </p>
          </article>
        </DocsLiveSearch>
      </div>
      <aside className="flex flex-col gap-8 lg:col-start-3 lg:row-start-1">
        {page.headings.length > 0 && <nav aria-labelledby="docs-toc" className="flex flex-col gap-2 text-sm">
          <p id="docs-toc" className="font-medium">{m.docs_toc({}, o)}</p>
          <ul {...text} className="flex flex-col gap-2">
            {page.headings.map(heading => <li key={heading.id}><a className="text-muted-foreground hover:text-foreground" href={`#${heading.id}`}>{heading.text}</a></li>)}
          </ul>
        </nav>}
      </aside>
      <div className="flex flex-col gap-2 lg:col-start-1 lg:row-start-1">
        <Separator className="lg:hidden" />
        <DocsNav locale={locale} nav={page.nav} current={page.slug} />
      </div>
    </div>
  </SiteShell>;
}
