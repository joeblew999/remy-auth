import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';

import { docsOrigin } from './origin';

/** The site header's "Docs" link (SiteNavLinks in the shared package): the docs Worker's home, which leads to the guide, the developer docs and the API reference. */
export function docsHeaderLink(locale: Locale) {
  return () => <NavigationMenuItem>
    <NavigationMenuLink render={<a href={docsOrigin} />}>{m.nav_docs({}, { locale })}</NavigationMenuLink>
  </NavigationMenuItem>;
}
