import { linkOptions } from '@tanstack/react-router';
import { NotebookPenIcon } from 'lucide-react';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { defineRemyApp } from '@joeblew999/remy-ui/app-config';
import { showcaseAppNav, showcaseSiteNav } from '@joeblew999/remy-showcase/app-nav';
import { docsConfig } from '../docs/docs.config';
import { docsOrigin } from './docs/origin';
import { product } from './product';
import { service } from './service';
import { sitePaths } from './paths';

// What the shared frame shows for this app (.plans/thin-apps.md, group 1): its name and source, the
// showcase's pages (this app shows them; another app lists its own) with its own notes demo after
// the account, and its docs Worker's origin.
const account = showcaseAppNav.findIndex(item => item.link.to === '/app/account') + 1;
const appNav = [
  ...showcaseAppNav.slice(0, account),
  { link: linkOptions({ to: '/app/notes' }), label: (locale: Locale) => m.nav_notes({}, { locale }), icon: <NotebookPenIcon />, core: false },
  ...showcaseAppNav.slice(account),
];

export const remyApp = defineRemyApp({
  brand: product,
  service,
  sitePaths,
  repository: docsConfig.repository,
  docs: docsOrigin,
  site: { nav: showcaseSiteNav },
  app: { home: linkOptions({ to: '/app' }), nav: appNav },
});
