import { zoneChecks, publicPageChecks, entryChecks, themeChecks, textChecks, fontChecks, observabilityChecks, cspChecks } from './checks.js';
import { existsSync } from 'node:fs';
import { partsFile, readParts } from './parts/list.js';

// One call per kind of app for the checks every app on the package runs, over the app's own pages (its
// `sitePaths` and `appPaths`: both zones, their entry URLs, text, fonts, observability, CSP, the theme), and
// nothing more: an app with pages of its own adds their checks. The home page's words are the app's to check (`home`); the structure is every app's
// (.plans/thin-apps.md, group 4). Checks that are not in a set stay separate calls. Part-aware
// (.plans/parts.md): what a listed part owns runs with partChecks() instead, never twice.

/** The app's listed parts: `parts` when given, else its src/parts.json when it has one, else none. */
const listedParts = parts => parts ?? (existsSync(partsFile) ? readParts() : []);

/**
 * A server-rendered app (TanStack Start rendering every request in the Worker): entry URLs redirect
 * to the visitor's language, every page carries the strict nonce CSP, fonts are checked per script.
 * Listed parts (`parts`, default the app's src/parts.json) own their checks: with seo-routes the sitemap is
 * its; with deferred-place the network location beside the device's is its to show.
 */
export function serverAppChecks({ service, sitePaths, appPaths = [], home, oneLanguage, parts, cspEnforced = true }) {
  const listed = listedParts(parts);
  const every = [...sitePaths, ...appPaths];
  zoneChecks({ sitePaths, appPaths });
  publicPageChecks({ paths: sitePaths, oneLanguage, sitemap: !listed.includes('seo-routes'), home });
  textChecks({ paths: every });
  fontChecks({ paths: sitePaths });
  entryChecks({ paths: every, mode: 'redirect' });
  themeChecks();
  observabilityChecks({ service, paths: every });
  cspChecks({ paths: every, enforce: cspEnforced });
}

/**
 * A fully prerendered app (every page written at build time, a thin Worker in front): entry pages
 * are static lists of every language.
 */
export function prerenderedAppChecks({ service, sitePaths, appPaths = [], home }) {
  const every = [...sitePaths, ...appPaths];
  zoneChecks({ sitePaths, appPaths });
  publicPageChecks({ paths: sitePaths, prerendered: true, home });
  entryChecks({ paths: every, mode: 'static' });
  themeChecks();
  observabilityChecks({ service, paths: every });
  textChecks({ paths: every });
}
