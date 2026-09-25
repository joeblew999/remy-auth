import { Link, useMatchRoute } from '@tanstack/react-router';
import { SidebarGroup, SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem } from '../../components/sidebar';

/** sidebar-16's NavMain, for links without sub-items: TanStack Links that preload on intent and mark the current page. */
export function NavMain({ label, items }: { label: string; items: { title: string; to: '/' | '/app' | '/app/formats' | '/app/demo' | '/app/location'; icon: React.ReactNode }[] }) {
  const matchRoute = useMatchRoute();
  return (
    <SidebarGroup>
      <SidebarGroupLabel>{label}</SidebarGroupLabel>
      <SidebarMenu>
        {items.map(item => {
          const active = Boolean(matchRoute({ to: item.to, fuzzy: item.to !== '/' && item.to !== '/app' }));
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
