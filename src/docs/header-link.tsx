import { lazy, Suspense, useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';

// Kept apart from the docs view: the root route renders it on every page, and it must not pull the
// docs' content into every page's code.

/** The live search panel (search-panel.tsx): its code, shadcn's Command and cmdk, loads only when it first opens. */
const loadPanel = () => import('./search-panel');
const SearchPanel = lazy(loadPanel);

/**
 * The site header's "Docs" and "Search" links (SiteNavLinks in the shared package): plain links, no
 * form. Docs is active on the docs pages, Search on the search page.
 */
export function docsHeaderLink(locale: Locale) {
  return (path: string) => <>
    <NavigationMenuItem>
      <NavigationMenuLink active={path === '/docs' || (path.startsWith('/docs/') && path !== '/docs/search')} render={<Link to="/docs" preload="intent" activeOptions={{ exact: true }} />}>{m.nav_docs({}, { locale })}</NavigationMenuLink>
    </NavigationMenuItem>
    <SearchLink locale={locale} active={path === '/docs/search'} />
  </>;
}

/**
 * "Search": without JavaScript (or with a modifier key) the link to /docs/search; with it, a plain
 * click or ⌘K / Ctrl+K opens the live search panel instead (.plans/docs-site.md, "Live search panel").
 */
function SearchLink({ locale, active }: { locale: Locale; active: boolean }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const show = (next: boolean) => { setLoaded(true); setOpen(next); };
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      setLoaded(true);
      setOpen(value => !value);
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);
  return <NavigationMenuItem>
    <NavigationMenuLink active={active} render={<Link to="/docs/search" preload="intent" aria-keyshortcuts="Meta+K Control+K" aria-haspopup="dialog"
      onPointerEnter={() => void loadPanel()}
      onClick={event => {
        if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        show(true);
      }} />}>{m.search_submit({}, { locale })}</NavigationMenuLink>
    {loaded && <Suspense fallback={null}><SearchPanel locale={locale} open={open} onOpenChange={setOpen} /></Suspense>}
  </NavigationMenuItem>;
}
