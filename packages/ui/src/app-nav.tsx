import { CalendarDaysIcon, ClockIcon, LayoutDashboardIcon, MapPinIcon, MousePointerClickIcon, SettingsIcon, UserIcon } from 'lucide-react';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';

// The app's pages, once, for both of its navigations (.plans/done/mobile-navigation.md): the sidebar on tablets
// and desktops lists them all; the bottom bar on phones shows the core ones and More, which opens the
// sidebar. Material 3 and Apple: a bottom bar holds three to five top-level destinations.

export type AppPath = '/app' | '/app/formats' | '/app/clock' | '/app/account' | '/app/demo' | '/app/location' | '/app/settings';
export type AppNavItem = { title: string; to: AppPath; icon: React.ReactNode; core: boolean };

/** Every app page in the sidebar's order; `core` ones are also the phone's bottom bar, in the same order. */
export function appNavItems(locale: Locale): AppNavItem[] {
  const o = { locale };
  return [
    { title: m.nav_home({}, o), to: '/app', icon: <LayoutDashboardIcon />, core: true },
    { title: m.nav_formats({}, o), to: '/app/formats', icon: <CalendarDaysIcon />, core: true },
    { title: m.nav_clock({}, o), to: '/app/clock', icon: <ClockIcon />, core: true },
    { title: m.nav_account({}, o), to: '/app/account', icon: <UserIcon />, core: true },
    { title: m.nav_demo({}, o), to: '/app/demo', icon: <MousePointerClickIcon />, core: false },
    { title: m.nav_location({}, o), to: '/app/location', icon: <MapPinIcon />, core: false },
    { title: m.nav_settings({}, o), to: '/app/settings', icon: <SettingsIcon />, core: false },
  ];
}

/** Whether a destination is the current page: the overview only exactly, the others with their sub-pages. */
export const matchesNav = (to: AppPath) => ({ to, fuzzy: to !== '/app' });
