import { linkOptions } from '@tanstack/react-router';
import { defineRemyApp } from '@joeblew999/remy-ui/app-config';
import { showcaseAppNav, showcaseSiteNav } from '@joeblew999/remy-ui/showcase/app-nav';
import { docsConfig } from '../docs/docs.config';
import { docsOrigin } from './docs/origin';

// What the shared frame shows for this app (.plans/thin-apps.md, group 1): its name and source, the
// showcase's pages (this app shows them; another app lists its own), and its docs Worker's origin.
export const remyApp = defineRemyApp({
  brand: 'Remy',
  repository: docsConfig.repository,
  docs: docsOrigin,
  site: { nav: showcaseSiteNav },
  app: { home: linkOptions({ to: '/app' }), nav: showcaseAppNav },
});
