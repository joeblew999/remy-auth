import { Suspense } from 'react';
import { Link } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { SiteShell } from '@joeblew999/remy-ui/pages';
import { Separator } from '@joeblew999/remy-ui/components/separator';
import type { DocsPageData } from './source.server';
import { docsComponents } from './content';
import { docsContent } from './loader';
import { AskForm } from './ask-form';
import { branch, docsPath, repository } from './table.js';

// A docs page (.plans/docs-site.md, decision 4): text first, then the question box, "On this page"
// and the docs navigation; no hero, no cards. It is a site page in SiteShell, complete in the server's
// HTML. The article is English (lang="en") inside a frame in the visitor's language.

export function DocsView({ locale, page, preferred }: { locale: Locale; page: DocsPageData; preferred?: Locale }) {
  const o = { locale };
  const path = docsPath(page.slug);
  const Content = docsContent.getComponent(page.file);
  return <SiteShell locale={locale} path={path} preferred={preferred}>
    <div className="grid grid-cols-[minmax(0,1fr)] gap-10 lg:grid-cols-[12rem_minmax(0,1fr)_14rem]">
      <article lang="en" dir="ltr" className="min-w-0 max-w-3xl break-words lg:col-start-2 lg:row-start-1" data-docs-article={page.slug}>
        {/* The content is loaded before rendering: by the loader on the server and on navigations, and
            before hydration by the router (loader.tsx), so no fallback ever shows. */}
        <Suspense><Content components={docsComponents} /></Suspense>
        <p className="mt-10 text-sm text-muted-foreground">
          <a className="underline underline-offset-4" href={`${repository}/blob/${branch}/${page.file}`}>{m.docs_source({}, o)}</a>
        </p>
      </article>
      <aside className="flex flex-col gap-8 lg:col-start-3 lg:row-start-1">
        <AskForm locale={locale} />
        {page.headings.length > 0 && <nav aria-labelledby="docs-toc" className="flex flex-col gap-2 text-sm">
          <p id="docs-toc" className="font-medium">{m.docs_toc({}, o)}</p>
          <ul lang="en" dir="ltr" className="flex flex-col gap-2">
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

/** The docs navigation: every docs page by title, the current one marked. */
export function DocsNav({ locale, nav, current }: { locale: Locale; nav: DocsPageData['nav']; current?: string }) {
  return <nav aria-labelledby="docs-nav" className="flex flex-col gap-2 text-sm">
    <p id="docs-nav" className="font-medium">{m.docs_nav({}, { locale })}</p>
    <ul lang="en" dir="ltr" className="flex flex-col gap-2">
      {nav.map(item => <li key={item.slug}><DocsNavLink slug={item.slug} current={item.slug === current}>{item.title}</DocsNavLink></li>)}
    </ul>
  </nav>;
}

function DocsNavLink({ slug, current, children }: { slug: string; current: boolean; children: React.ReactNode }) {
  const className = current ? 'font-medium text-foreground' : 'text-muted-foreground hover:text-foreground';
  const aria = current ? 'page' as const : undefined;
  return slug
    ? <Link to="/docs/$slug" params={{ slug }} preload="intent" className={className} aria-current={aria}>{children}</Link>
    : <Link to="/docs" preload="intent" activeOptions={{ exact: true }} className={className} aria-current={aria}>{children}</Link>;
}
