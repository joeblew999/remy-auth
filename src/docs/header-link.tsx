import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';

import { docsOrigin } from './origin';

/** The site header's "Docs" link (SiteNavLinks in the shared package): the docs Worker's guide. */
export function docsHeaderLink(locale: Locale) {
  return () => <NavigationMenuItem>
    <NavigationMenuLink render={<a href={`${docsOrigin}/docs`} />}>{m.nav_docs({}, { locale })}</NavigationMenuLink>
  </NavigationMenuItem>;
}
