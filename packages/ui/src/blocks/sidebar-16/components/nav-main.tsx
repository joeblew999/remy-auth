import { Link, useMatchRoute } from '@tanstack/react-router';
import type { AppNavItem } from '../../../app-nav';
import { matchesNav } from '../../../app-nav';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../../components/sidebar';

/** sidebar-16's NavMain, for links without sub-items: TanStack Links that preload on intent and mark the current page. */
export function NavMain({ label, items }: { label: string; items: AppNavItem[] }) {
  const matchRoute = useMatchRoute();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => {
          const active = Boolean(matchRoute(matchesNav(item.to)));
          return <SidebarMenuItem key={item.to}>
            <SidebarMenuButton tooltip={item.title} isActive={active} render={<Link to={item.to} preload="intent" aria-current={active ? 'page' : undefined} />}>
              {item.icon}
              <span>{item.title}</span>
            </SidebarMenuButton>
          </SidebarMenuItem>;
        })}
      </SidebarMenu>
    </SidebarGroup>
  );
}
