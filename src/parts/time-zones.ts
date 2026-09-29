import { linkOptions } from '@tanstack/react-router';
import type { NavItem } from '@joeblew999/remy-ui/app-config';
import { m } from '@joeblew999/remy-ui/messages';

// This app's options for the time-zones part (src/parts.json): the page above a zone in its breadcrumb.
export const parent: NavItem = { link: linkOptions({ to: '/formats' }), label: locale => m.nav_formats({}, { locale }) };
