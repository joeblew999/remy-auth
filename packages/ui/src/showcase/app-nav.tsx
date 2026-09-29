import { linkOptions } from '@tanstack/react-router';
import { CalendarDaysIcon, ClockIcon, LayoutDashboardIcon, MapPinIcon, MousePointerClickIcon, SettingsIcon, UserIcon } from 'lucide-react';
import type { Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import type { NavItem } from '../app-config';
import { clockDefaults } from '../clock-route';

// The showcase's navigation (remy-auth's own pages: formats, and the app's clock, demo, location, account
// and settings), for the apps that show them: remy-auth and remy-auth-app put these in defineRemyApp. An
// app with other pages writes its own lists the same way and never imports this module, so it never
// type-checks these routes (.plans/thin-apps.md, group 1). The app's pages once, for both of its
// navigations (.plans/done/mobile-navigation.md): the sidebar lists them all; the phone's bottom bar
// shows the core ones and More. Material 3 and Apple: a bottom bar holds three to five destinations.

/** The site header's showcase link. */
export const showcaseSiteNav: NavItem[] = [
  { link: linkOptions({ to: '/formats' }), label: (locale: Locale) => m.nav_formats({}, { locale }) },
];

/** The showcase app's pages in the sidebar's order; `core` ones are also the phone's bottom bar. */
export const showcaseAppNav: NavItem[] = [
  { link: linkOptions({ to: '/app' }), label: (locale: Locale) => m.nav_home({}, { locale }), icon: <LayoutDashboardIcon />, core: true, exact: true },
  { link: linkOptions({ to: '/app/formats' }), label: (locale: Locale) => m.nav_formats({}, { locale }), icon: <CalendarDaysIcon />, core: true },
  { link: linkOptions({ to: '/app/clock', search: clockDefaults }), label: (locale: Locale) => m.nav_clock({}, { locale }), icon: <ClockIcon />, core: true },
  { link: linkOptions({ to: '/app/account' }), label: (locale: Locale) => m.nav_account({}, { locale }), icon: <UserIcon />, core: true },
  { link: linkOptions({ to: '/app/demo' }), label: (locale: Locale) => m.nav_demo({}, { locale }), icon: <MousePointerClickIcon />, core: false },
  { link: linkOptions({ to: '/app/location' }), label: (locale: Locale) => m.nav_location({}, { locale }), icon: <MapPinIcon />, core: false },
  { link: linkOptions({ to: '/app/settings' }), label: (locale: Locale) => m.nav_settings({}, { locale }), icon: <SettingsIcon />, core: false },
];
