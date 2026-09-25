// The parts an app lists (.plans/parts.md): one name per line in the app's src/parts.json, read in
// plain Node by the Vite config (routes and the virtual modules) and by Playwright (checks), so the
// browser bundle, the Worker, the routes and the checks all follow the same list.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Every part the package offers.
 * - `routes`: the part has a route directory (`<name>/routes`), mounted beside the app's own routes.
 * - `requires`: parts that must be listed too.
 * - `entries`: modules the app imports as `virtual:remy-parts/<name>/<entry>` (the part's
 *   `<name>/<entry>` file), each with its export names: a listed part's real exports, an unlisted
 *   part's `undefined`, so the app renders or calls them only when present and nothing is left behind.
 * - `app`: export names the part reads from the app's own `src/parts/<name>.ts` (the app's options
 *   for the part), as `virtual:remy-parts/<name>/app`; `undefined` when the app has no such file.
 * - `sitePaths`: site pages the part adds (de-localized, as ../paths.js), for the sitemap and the checks.
 */
export const catalog = {
  'time-zones': { routes: true, requires: [], entries: {}, app: [], sitePaths: [] },
  'deferred-place': { routes: false, requires: [], entries: { place: ['getPlace'], ui: ['DeferredPlace'] }, app: [], sitePaths: [] },
  'seo-routes': { routes: true, requires: [], entries: {}, app: ['sitemapEntries'], sitePaths: [] },
  'status-card': { routes: false, requires: [], entries: { ui: ['StatusCard', 'statusCardLoader'] }, app: ['statusQuery'], sitePaths: [] },
};

/** The default list file, relative to the app's root. */
export const partsFile = 'src/parts.json';

/** Where an app keeps its options for a part (its `app` exports), relative to the app's root, without extension. */
export const partAppFile = name => `src/parts/${name}`;

/** The app's parts, in list order; throws on an unknown name, a duplicate or a missing requirement. */
export function readParts({ root = process.cwd(), file = partsFile } = {}) {
  const names = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  if (!Array.isArray(names)) throw new Error(`${file}: expected an array of part names`);
  const problems = [];
  names.forEach((name, index) => {
    if (!Object.hasOwn(catalog, name)) problems.push(`unknown part "${name}" (known: ${Object.keys(catalog).join(', ')})`);
    else if (names.indexOf(name) !== index) problems.push(`"${name}" is listed twice`);
    else for (const needed of catalog[name].requires) if (!names.includes(needed)) problems.push(`"${name}" requires "${needed}"`);
  });
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`);
  return names;
}

/** The site pages the listed parts add, in list order. */
export const partSitePaths = names => names.flatMap(name => catalog[name].sitePaths);
