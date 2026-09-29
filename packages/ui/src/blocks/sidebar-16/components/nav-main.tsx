import { Link, useMatchRoute } from '@tanstack/react-router';
import type { Locale } from '../../../paraglide/runtime.js';
import { navLink, type NavItem } from '../../../app-config';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../../components/sidebar';

/** sidebar-16's NavMain, for links without sub-items: TanStack Links that preload on intent and mark the current page. */
export function NavMain({ locale, label, items }: { locale: Locale; label: string; items: readonly NavItem[] }) {
  const matchRoute = useMatchRoute();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => {
          const { link, match } = navLink(item);
          const active = Boolean(matchRoute(match));
          const title = item.label(locale);
          return <SidebarMenuItem key={String(link.to)}>
            <SidebarMenuButton tooltip={title} isActive={active} render={<Link {...link} preload="intent" aria-current={active ? 'page' : undefined} />}>
              {item.icon}
              <span>{title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
