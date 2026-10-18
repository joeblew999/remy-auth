import {
  zoneChecks,
  publicPageChecks,
  entryChecks,
  themeChecks,
  textChecks,
  fontChecks,
  observabilityChecks,
  cspChecks,
} from './checks.ts';
import { buildChecks, buildStampChecks, productNameChecks } from './versions.checks.ts';
import { existsSync } from 'node:fs';
import { partsFile, readParts } from './parts/list.ts';
import type { PartName } from './parts/list.ts';
import type { HomeContent } from './checks.ts';

type AppCheckOptions = {
  /** The Worker's service name in its logs and response headers. */
  service: string;
  /** The app's site pages (for Google; '' is its home): zones, public pages, entry URLs, fonts, observability. */
  sitePaths: string[];
  /** The app's app pages (under /app), if it has an app side. */
  appPaths?: string[];
  /** The home page's own words, checked exactly; without them, only that a heading, description and brand are there. */
  home?: HomeContent;
};

// One call per kind of app for the checks every app on the package runs, over the app's own pages (its
// `sitePaths` and `appPaths`: both zones, their entry URLs, text, fonts, observability, CSP, the theme, which
// build and whose name each page carries), and
// nothing more: an app with pages of its own adds their checks. The home page's words are the app's to check (`home`); the structure is every app's
// (issue #34, group 4). Checks that are not in a set stay separate calls. Part-aware
// (plan: https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/parts.md): what a listed part owns runs with partChecks() instead, never twice.

/** The app's listed parts: `parts` when given, else its src/parts.json when it has one, else none. */
const listedParts = (parts: readonly PartName[] | undefined): readonly PartName[] =>
  parts ?? (existsSync(partsFile) ? readParts() : []);

/** What the app is, to its reader: the build its Worker answers with, the stamp its app frame shows, and its own name on every page. */
function identityChecks({ service, appPaths, every }: { service: string; appPaths: string[]; every: string[] }): void {
  buildChecks({ service });
  if (appPaths.length) buildStampChecks({ path: appPaths[0] });
  productNameChecks({ paths: every });
}

/**
 * A server-rendered app (TanStack Start rendering every request in the Worker): entry URLs redirect
 * to the visitor's language, every page carries the strict nonce CSP, fonts are checked per script.
 * Listed parts (`parts`, default the app's src/parts.json) own their checks: with seo-routes the sitemap is
 * its; with deferred-place the network location beside the device's is its to show.
 */
export function serverAppChecks({
  service,
  sitePaths,
  appPaths = [],
  home,
  oneLanguage,
  parts,
  cspEnforced = true,
}: AppCheckOptions & {
  oneLanguage?: { locale: string; paths: string[]; translations?: Record<string, string[]> };
  /**
   * The app's listed parts (default: its src/parts.json, or none without one). What a listed part owns
   * runs with partChecks() instead: seo-routes the sitemap, deferred-place the network place.
   */
  parts?: readonly PartName[];
  /** Whether the app enforces its nonce CSP (default true) or sends it report-only: the app's own switch, passed to cspChecks. */
  cspEnforced?: boolean;
}): void {
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
  identityChecks({ service, appPaths, every });
}

/**
 * A fully prerendered app (every page written at build time, a thin Worker in front): entry pages
 * are static lists of every language.
 */
export function prerenderedAppChecks({ service, sitePaths, appPaths = [], home }: AppCheckOptions): void {
  const every = [...sitePaths, ...appPaths];
  zoneChecks({ sitePaths, appPaths });
  publicPageChecks({ paths: sitePaths, prerendered: true, home });
  entryChecks({ paths: every, mode: 'static' });
  themeChecks();
  observabilityChecks({ service, paths: every });
  textChecks({ paths: every });
  identityChecks({ service, appPaths, every });
}
