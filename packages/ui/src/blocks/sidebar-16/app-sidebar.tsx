import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon, GalleryVerticalEndIcon, LayoutDashboardIcon, MapPinIcon, MousePointerClickIcon } from 'lucide-react';
import { getTextDirection, type Locale } from '../../paraglide/runtime.js';
import { m } from '../../paraglide/messages.js';
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../components/sidebar';
import { NavMain } from './nav-main';

/** sidebar-16's AppSidebar with Remy's data; it opens on the reading side (right for right-to-left languages). */
export function AppSidebar({ locale }: { locale: Locale }) {
  const o = { locale };
  return (
    <Sidebar side={getTextDirection(locale) === 'rtl' ? 'right' : 'left'} className="top-(--header-height) h-[calc(100svh-var(--header-height))]!">
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
        <NavMain label={m.nav_heading({}, o)} items={[
          { title: m.nav_home({}, o), to: '/app', icon: <LayoutDashboardIcon /> },
          { title: m.nav_demo({}, o), to: '/app/demo', icon: <MousePointerClickIcon /> },
          { title: m.nav_location({}, o), to: '/app/location', icon: <MapPinIcon /> },
        ]} />
        <NavMain label={m.back_to_site({}, o)} items={[{ title: m.back_to_site({}, o), to: '/', icon: <ArrowLeftIcon className="rtl:rotate-180" /> }]} />
      </SidebarContent>
    </Sidebar>
  );
}
