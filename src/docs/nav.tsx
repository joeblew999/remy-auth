import { Link } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import type { DocsPageData } from './source.server';

// Apart from the docs view, so pages that list the docs without showing one (search, answers) do not
// load the article renderer.

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
