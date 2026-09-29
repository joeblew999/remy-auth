import { linkOptions } from '@tanstack/react-router';
import { defineRemyApp } from '@joeblew999/remy-ui/app-config';
import { showcaseAppNav, showcaseSiteNav } from '@joeblew999/remy-ui/showcase/app-nav';
import { docsConfig } from '../docs/docs.config';
import { docsAppLink, docsHeaderLink } from './docs/header-link';

// What the shared frame shows for this app (.plans/thin-apps.md, group 1): its name and source, the
// showcase's pages (this app shows them; another app lists its own), and its docs on the docs Worker.
export const remyApp = defineRemyApp({
  brand: 'Remy',
  repository: docsConfig.repository,
  site: { nav: showcaseSiteNav, links: docsHeaderLink },
  app: { home: linkOptions({ to: '/app' }), nav: showcaseAppNav, links: docsAppLink },
});
