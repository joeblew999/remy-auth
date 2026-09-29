import { defineRemyApp } from '@joeblew999/remy-ui/app-config';
import { followLocale } from '@joeblew999/remy-ui/locale';
import * as catalog from './paraglide/runtime.js';
import { docsConfig } from '../docs/docs.config';
import { service } from './service';
import { sitePaths } from './paths';

// This app's own strings (messages/, compiled into src/paraglide) in the language the platform chose.
followLocale(catalog);

// What the shared frame shows for this app: its name, source and docs, and its pages' links
// (site: { nav }, app: { home, nav }, each written with TanStack's linkOptions).
export const remyApp = defineRemyApp({
  brand: docsConfig.product,
  service,
  sitePaths,
  repository: docsConfig.repository,
  docs: import.meta.env?.VITE_DOCS_ORIGIN,
});
