// The parts an app lists (.plans/parts.md): one name per line in the app's src/parts.json, read in
// plain Node by the Vite config (routes and the virtual modules) and by Playwright (checks), so the
// browser bundle, the Worker, the routes and the checks all follow the same list.
import { existsSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));

/**
 * The parts the platform offers (another package offers its own: its `parts/catalog.json`, in this shape, the
 * parts in folders beside it; an app lists one as `<package>/<name>`, e.g. `@joeblew999/remy-showcase/time-zones`).
 * - `routes`: the part has a route directory (`<name>/routes`), mounted beside the app's own routes.
 * - `requires`: parts that must be listed too.
 * - `entries`: modules the app imports as `virtual:remy-parts/<name>/<entry>` (the part's
 *   `<name>/<entry>` file), each with its export names: a listed part's real exports, an unlisted
 *   part's `undefined`, so the app renders or calls them only when present and nothing is left behind.
 * - `app`: export names the part reads from the app's own `src/parts/<name>.ts` (the app's options
 *   for the part), as `virtual:remy-parts/<name>/app`; `undefined` when the app has no such file.
 * - `sitePaths`: site pages the part adds (de-localized, as ../paths.js), for the sitemap and the checks.
 * Each part's folder has a `checks.js` whose default export runs its checks: `(options, listed) => void`.
 */
export const catalog = {
  'seo-routes': { routes: true, requires: [], entries: {}, app: ['sitemapEntries'], sitePaths: [] },
};

/** The default list file, relative to the app's root. */
export const partsFile = 'src/parts.json';

/** Where an app keeps its options for a part (its `app` exports), relative to the app's root, without extension. */
export const partAppFile = name => `src/parts/${name}`;

/**
 * The app's listed parts, in list order, by name (the part's own name, `time-zones` for
 * `@joeblew999/remy-showcase/time-zones`), each with its catalog entry, its folder (`dir`) and how it was listed
 * (`spec`). Throws on an unknown part, a name listed twice (from any package) or a missing requirement.
 */
export function listedParts({ root = process.cwd(), file = partsFile } = {}) {
  // No list is no parts: an app lists them only when it uses one.
  if (!existsSync(resolve(root, file))) return {};
  const specs = JSON.parse(readFileSync(resolve(root, file), 'utf8'));
  if (!Array.isArray(specs)) throw new Error(`${file}: expected an array of part names`);
  const fromApp = createRequire(join(resolve(root), 'package.json'));
  const listed = {};
  const problems = [];
  for (const spec of specs) {
    if (typeof spec !== 'string' || spec.split('/').length === 2 || (!spec.startsWith('@') && spec.includes('/')) || spec.split('/').length > 3) {
      problems.push(`${JSON.stringify(spec)}: a part is the platform's name ("seo-routes") or "@<scope>/<package>/<name>"`);
      continue;
    }
    const scoped = spec.startsWith('@');
    const name = scoped ? spec.split('/').slice(2).join('/') : spec;
    let entry, dir;
    if (scoped) {
      const pkg = spec.split('/').slice(0, 2).join('/');
      let file;
      try { file = fromApp.resolve(`${pkg}/parts/catalog.json`); } catch { problems.push(`"${spec}": ${pkg} offers no parts (no ${pkg}/parts/catalog.json)`); continue; }
      entry = JSON.parse(readFileSync(file, 'utf8'))[name];
      dir = join(dirname(file), name);
      if (!entry) { problems.push(`unknown part "${spec}"`); continue; }
    } else {
      entry = catalog[name];
      dir = join(here, name);
      if (!entry) { problems.push(`unknown part "${spec}" (the platform's: ${Object.keys(catalog).join(', ')})`); continue; }
    }
    if (Object.hasOwn(listed, name)) problems.push(`"${name}" is listed twice`);
    else listed[name] = { ...entry, dir, spec };
  }
  for (const [name, part] of Object.entries(listed)) for (const needed of part.requires) if (!Object.hasOwn(listed, needed)) problems.push(`"${name}" requires "${needed}"`);
  if (problems.length) throw new Error(`${file}: ${problems.join('; ')}`);
  return listed;
}

/**
 * A part the app does not list, by name: the platform's, else the first of the app's dependencies that offers it
 * (their parts/catalog.json). What an unlisted part's modules export (all undefined) comes from here.
 */
export function offeredPart(name, { root = process.cwd() } = {}) {
  if (Object.hasOwn(catalog, name)) return catalog[name];
  const manifest = JSON.parse(readFileSync(join(resolve(root), 'package.json'), 'utf8'));
  const fromApp = createRequire(join(resolve(root), 'package.json'));
  for (const dep of Object.keys({ ...manifest.dependencies, ...manifest.devDependencies })) {
    let file;
    try { file = fromApp.resolve(`${dep}/parts/catalog.json`); } catch { continue; }
    const entry = JSON.parse(readFileSync(file, 'utf8'))[name];
    if (entry) return entry;
  }
  return undefined;
}

/** The app's listed parts' names, in list order. */
export const readParts = options => Object.keys(listedParts(options));

/** The site pages the listed parts add, in list order. */
export const partSitePaths = listed => Object.values(listed).flatMap(part => part.sitePaths);
