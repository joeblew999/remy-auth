import { zoneChecks, publicPageChecks, entryChecks, demoChecks, formatsChecks, textChecks, fontChecks, observabilityChecks, cspChecks } from './checks.js';
import { sitePaths, appPaths, allPaths } from './paths.js';
import { navigationBlockingChecks } from './showcase/navigation-blocking.checks.js';
import { preloadChecks } from './showcase/preload.checks.js';
import { searchParamsChecks } from './showcase/search-params.checks.js';
import { devicePlaceChecks } from './showcase/device-place.checks.js';

// One call per kind of app for the checks every app on the package runs: the shared pages (paths.js)
// in both zones, their entry URLs, text, observability and the showcase rows that app kind can show.
// The app passes its own pages beside the shared ones (`ownSitePaths`, `ownAppPaths`: remy-auth's
// docs) and keeps only the checks for what it adds. Checks that are not in a set stay separate calls.

const zones = ({ ownSitePaths, ownAppPaths }) => ({
  sites: [...sitePaths, ...ownSitePaths],
  apps: [...appPaths, ...ownAppPaths],
  every: [...allPaths, ...ownSitePaths, ...ownAppPaths],
});

/**
 * A server-rendered app (TanStack Start rendering every request in the Worker): entry URLs redirect
 * to the visitor's language, every page carries the strict nonce CSP, fonts are checked per script,
 * and the showcase rows use server functions and the network location.
 */
export function serverAppChecks({ service, ownSitePaths = [], ownAppPaths = [], oneLanguage, formats = {}, devicePath = '/app/location' }) {
  const { sites, apps, every } = zones({ ownSitePaths, ownAppPaths });
  zoneChecks({ sitePaths: sites, appPaths: apps });
  publicPageChecks({ paths: sitePaths, oneLanguage });
  // Text in every language, and the font drawing each language: the shared pages.
  textChecks({ paths: allPaths });
  fontChecks({ paths: sitePaths });
  entryChecks({ paths: every, mode: 'redirect' });
  demoChecks();
  observabilityChecks({ service, paths: every });
  cspChecks({ paths: every });
  searchParamsChecks();
  preloadChecks();
  navigationBlockingChecks();
  devicePlaceChecks({ path: devicePath, network: true });
  formatsChecks(formats);
}

/**
 * A fully prerendered app (every page written at build time, a thin Worker in front): entry pages
 * are static lists of every language, and the showcase rows work without server functions.
 */
export function prerenderedAppChecks({ service, ownSitePaths = [], ownAppPaths = [], formats = {}, devicePath = '/app/location' }) {
  const { sites, apps, every } = zones({ ownSitePaths, ownAppPaths });
  zoneChecks({ sitePaths: sites, appPaths: apps });
  publicPageChecks({ paths: sitePaths, prerendered: true });
  entryChecks({ paths: every, mode: 'static' });
  demoChecks();
  formatsChecks(formats);
  textChecks({ paths: every });
  observabilityChecks({ service, paths: every });
  navigationBlockingChecks();
  preloadChecks({ serverFn: false });
  searchParamsChecks({ serverRendered: false });
  devicePlaceChecks({ path: devicePath });
}
