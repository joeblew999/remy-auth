import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { NavigationMenuItem, NavigationMenuLink } from '@joeblew999/remy-ui/components/navigation-menu';
import { SidebarMenuButton, SidebarMenuItem } from '@joeblew999/remy-ui/components/sidebar';
import { BookOpenIcon } from 'lucide-react';
import { docsOrigin } from './origin';

/** The site header's docs links (SiteNavLinks in the shared package): the guide and the developer docs, on the docs Worker. */
export function docsHeaderLink(locale: Locale) {
  return () => <>
    <NavigationMenuItem>
      <NavigationMenuLink render={<a href={`${docsOrigin}/docs`} />}>{m.nav_docs({}, { locale })}</NavigationMenuLink>
    </NavigationMenuItem>
    <NavigationMenuItem>
      <NavigationMenuLink render={<a href={`${docsOrigin}/dev`} />}>{m.nav_developers({}, { locale })}</NavigationMenuLink>
    </NavigationMenuItem>
  </>;
}

/** The app sidebar's guide link (AppNavLinks in the shared package): help for people using the app. */
export function docsAppLink(locale: Locale) {
  return <SidebarMenuItem>
    <SidebarMenuButton render={<a href={`${docsOrigin}/docs`} />}>
      <BookOpenIcon />
      <span>{m.nav_guide({}, { locale })}</span>
    </SidebarMenuButton>
  </SidebarMenuItem>;
}
