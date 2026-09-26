import { Link, useMatchRoute } from '@tanstack/react-router';
import { MenuIcon } from 'lucide-react';
import { cn } from 'cn';
import type { Locale } from '../../paraglide/runtime.js';
import { m } from '../../paraglide/messages.js';
import { useSidebar } from '../../components/sidebar';
import { appNavItems, matchesNav } from '../../app-nav';

// The phone's bottom bar (.plans/mobile-navigation.md). shadcn has no bottom navigation (issues #4398,
// #8847), so this owned block is made of shadcn's own parts: the sidebar's state (More opens the sidebar
// as its sheet, with every page), its colours and focus ring, and TanStack Links. Shown below shadcn's
// mobile breakpoint (md, 768 px, the width useIsMobile uses to turn the sidebar into a sheet), by CSS, so
// the server's HTML is right before any script runs. Material 3's navigation bar: labels always shown,
// the active destination in a pill, above the home indicator.

const tab = 'flex min-h-16 w-full flex-col items-center justify-center gap-1 px-1 text-xs outline-none focus-visible:ring-3 focus-visible:ring-ring/50';
const pill = 'flex h-8 w-14 max-w-full items-center justify-center rounded-full [&_svg]:size-5';

export function BottomNav({ locale }: { locale: Locale }) {
  const matchRoute = useMatchRoute();
  const { openMobile, setOpenMobile } = useSidebar();
  return <nav aria-label={m.nav_bottom({}, { locale })} data-slot="bottom-nav"
    className="fixed inset-x-0 bottom-0 z-40 border-t bg-background pb-[env(safe-area-inset-bottom)] md:hidden">
    <ul className="grid grid-cols-5">
      {appNavItems(locale).filter(item => item.core).map(item => {
        const active = Boolean(matchRoute(matchesNav(item.to)));
        return <li key={item.to}>
          <Link to={item.to} preload="intent" aria-current={active ? 'page' : undefined}
            className={cn(tab, active ? 'font-medium text-foreground' : 'text-muted-foreground')}>
            <span className={cn(pill, active && 'bg-accent text-accent-foreground')}>{item.icon}</span>
            <span className="max-w-full truncate">{item.title}</span>
          </Link>
        </li>;
      })}
      <li>
        <button type="button" onClick={() => setOpenMobile(true)} aria-expanded={openMobile} aria-haspopup="dialog"
          className={cn(tab, openMobile ? 'font-medium text-foreground' : 'text-muted-foreground')}>
          <span className={cn(pill, openMobile && 'bg-accent text-accent-foreground')}><MenuIcon /></span>
          <span className="max-w-full truncate">{m.nav_more({}, { locale })}</span>
        </button>
      </li>
    </ul>
  </nav>;
}
