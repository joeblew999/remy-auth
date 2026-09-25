import { Link } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';

// Kept apart from the docs view: the root route renders it on every page, and it must not pull the
// docs' content into every page's code.

/**
 * The site header's "Docs" and "Search" links (SiteNavLinks in the shared package): plain links, no
 * form, so the header adds no script. Docs is active on the docs pages, Search on the search page.
 */
export function docsHeaderLink(locale: Locale) {
  return (path: string) => <>
    <NavigationMenuItem>
      <NavigationMenuLink active={path === '/docs' || (path.startsWith('/docs/') && path !== '/docs/search')} render={<Link to="/docs" preload="intent" activeOptions={{ exact: true }} />}>{m.nav_docs({}, { locale })}</NavigationMenuLink>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink active={path === '/docs/search'} render={<Link to="/docs/search" preload="intent" />}>{m.search_submit({}, { locale })}</NavigationMenuLink>
    </NavigationMenuItem>
  </>;
}
