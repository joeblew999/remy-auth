import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, BookOpenIcon, GalleryVerticalEndIcon } from 'lucide-react';
import { getTextDirection, type Locale } from '../../../paraglide/runtime.js';
import { m } from '../../../paraglide/messages.js';
import { Sidebar, SidebarContent, SidebarFooter, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../../components/sidebar';
import { NavMain } from './nav-main';
import { useRemyApp } from '../../../app-config';

/**
 * sidebar-16's AppSidebar with the app's data (defineRemyApp: its name, home and pages); it opens on the reading side (right for right-to-left languages).
 * On tablets and desktops it collapses to icons (a rail, Material 3's medium widths); on phones it is the
 * sheet the bottom bar's More opens (.plans/done/mobile-navigation.md).
 */
export function AppSidebar({ locale }: { locale: Locale }) {
  const o = { locale };
  const app = useRemyApp();
  return (
    <Sidebar collapsible="icon" side={getTextDirection(locale) === 'rtl' ? 'right' : 'left'} className="top-(--header-height) h-[calc(100svh-var(--header-height))]!">
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" render={app.app ? <Link {...app.app.home} preload="intent" /> : <Link to="/" preload="intent" />}>
              <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-sidebar-primary text-sidebar-primary-foreground">
                <GalleryVerticalEndIcon className="size-4" />
              </div>
              <div className="grid flex-1 text-start text-sm leading-tight">
                <span className="truncate font-medium">{app.brand}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain locale={locale} label={m.nav_heading({}, o)} items={app.app?.nav ?? []} />
      </SidebarContent>
      {/* In the footer, which stays in view however short the screen (a phone in landscape). */}
      <SidebarFooter>
        <SidebarMenu>
          {app.docs && <SidebarMenuItem>
            <SidebarMenuButton render={<a href={`${app.docs}/docs`} />}>
              <BookOpenIcon />
              <span>{m.nav_guide({}, o)}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>}
          {app.app?.links?.(locale)}
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
