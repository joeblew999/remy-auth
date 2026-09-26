import { useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, GalleryVerticalEndIcon } from 'lucide-react';
import { appNavItems } from '../../../app-nav';
import { getTextDirection, type Locale } from '../../../paraglide/runtime.js';
import { m } from '../../../paraglide/messages.js';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../../components/sidebar';
import { NavMain } from './nav-main';
import { AppNavLinks } from '../../../shell';

/**
 * sidebar-16's AppSidebar with Remy's data; it opens on the reading side (right for right-to-left languages).
 * On tablets and desktops it collapses to icons (a rail, Material 3's medium widths); on phones it is the
 * sheet the bottom bar's More opens (.plans/done/mobile-navigation.md).
 */
export function AppSidebar({ locale }: { locale: Locale }) {
  const o = { locale };
  const appLinks = useContext(AppNavLinks);
  return (
    <Sidebar collapsible="icon" side={getTextDirection(locale) === 'rtl' ? 'right' : 'left'} className="top-(--header-height) h-[calc(100svh-var(--header-height))]!">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={<Link to="/app" preload="intent" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">Remy</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain label={m.nav_heading({}, o)} items={appNavItems(locale)} />
      </SidebarContent>
      {/* In the footer, which stays in view however short the screen (a phone in landscape). */}
      <SidebarFooter>
        <SidebarMenu>
          {appLinks}
          <SidebarMenuItem>
            <SidebarMenuButton render={<Link to="/" />}>
              <ArrowLeftIcon className="rtl:rotate-180" />
              <span>{m.back_to_site({}, o)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>
    </Sidebar>
  );
}
