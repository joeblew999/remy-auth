import { useEffect } from 'react';
import { Link, useNavigate } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';

// Kept apart from the docs view: the root route renders it on every page, and it must not pull the
// docs' content into every page's code.

import { docsSearchInputId } from './search-id';

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
 * "Search": the link to /docs/search. On a docs page, a plain click and ⌘K / Ctrl+K go to the search box
 * at the top of the docs area instead (live-search.tsx); elsewhere ⌘K opens the search page.
 */
function SearchLink({ locale, active }: { locale: Locale; active: boolean }) {
  const navigate = useNavigate();
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key.toLowerCase() !== 'k' || !(event.metaKey || event.ctrlKey) || event.altKey || event.shiftKey) return;
      event.preventDefault();
      const box = document.getElementById(docsSearchInputId);
      if (box) box.focus(); else void navigate({ to: '/docs/search' });
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [navigate]);
  return <NavigationMenuItem>
    <NavigationMenuLink active={active} render={<Link to="/docs/search" preload="intent" aria-keyshortcuts="Meta+K Control+K"
      onClick={event => {
        const box = document.getElementById(docsSearchInputId);
        if (!box || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        event.preventDefault();
        box.focus();
      }} />}>{m.search_submit({}, { locale })}</NavigationMenuLink>
  </NavigationMenuItem>;
}
