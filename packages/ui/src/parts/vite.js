// The parts' Vite side (.plans/parts.md, candidate 2): a plugin that generates the `virtual:remy-parts`
// modules from the app's list, and the route config that mounts each listed part's route directory
// beside the app's own routes through TanStack's virtual file routes (physical()). A part left out of
// the list leaves no route, no server function and no bundle code behind.
import { existsSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { physical, rootRoute } from '@tanstack/virtual-file-routes';
import { catalog, partAppFile, partSitePaths, readParts } from './list.js';

const id = 'virtual:remy-parts';
const here = dirname(fileURLToPath(import.meta.url));

/** The file a module path names, trying the extensions a part or an app writes; undefined if none exists. */
const withExtension = path => ['.ts', '.tsx', '.js'].map(extension => path + extension).find(file => existsSync(file));

/** A module exporting each of `names` as `undefined`: what an unlisted part's entry is. */
const absent = names => names.map(name => `export const ${name} = undefined;\n`).join('');

/**
 * `const parts = remyParts()` in vite.config.ts, then `parts.plugin` among the plugins and
 * `tanstackStart({ router: { virtualRouteConfig: parts.routes } })`.
 * `routesDirectory` is the app's (TanStack's default, src/routes) with its `__root.tsx`.
 *
 * Modules the plugin serves:
 * - `virtual:remy-parts`: `parts` (the list), `hasPart(name)`, `sitePaths` (the site pages the listed parts add).
 * - `virtual:remy-parts/<part>/<entry>`: the part's entry module when the part is listed, else its
 *   export names as `undefined` (catalog `entries`).
 * - `virtual:remy-parts/<part>/app`: the app's options for the part, from `src/parts/<part>.ts`
 *   (catalog `app`); `undefined` for each when the part is unlisted or the app has no such file.
 */
export function remyParts({ root = process.cwd(), file, routesDirectory = 'src/routes' } = {}) {
  const names = readParts({ root, file });
  const routesDir = resolve(root, routesDirectory);
  const routes = rootRoute('__root.tsx', [
    physical('', '.'),
    ...names.filter(name => catalog[name].routes).map(name => physical('', relative(routesDir, join(here, name, 'routes')))),
  ]);
  const code = source => {
    if (source === id) return `export const parts = ${JSON.stringify(names)};\nexport const hasPart = name => parts.includes(name);\nexport const sitePaths = ${JSON.stringify(partSitePaths(names))};\n`;
    const [part, entry, ...rest] = source.slice(id.length + 1).split('/');
    const known = Object.hasOwn(catalog, part) && rest.length === 0 && (entry === 'app' || Object.hasOwn(catalog[part].entries, entry));
    if (!known) throw new Error(`${source}: no such parts module (see @joeblew999/remy-ui/parts catalog)`);
    const exports = entry === 'app' ? catalog[part].app : catalog[part].entries[entry];
    if (!names.includes(part)) return absent(exports);
    if (entry === 'app') {
      // The app's file may export only some of the options: read them from its namespace.
      const app = withExtension(resolve(root, partAppFile(part)));
      return app ? `import * as app from ${JSON.stringify(app)};\n${exports.map(name => `export const ${name} = app.${name};\n`).join('')}` : absent(exports);
    }
    const module = withExtension(join(here, part, entry));
    if (!module) throw new Error(`${source}: the part's ${entry} module is missing`);
    return `export { ${exports.join(', ')} } from ${JSON.stringify(module)};\n`;
  };
  const plugin = {
    name: 'remy-parts',
    resolveId: source => source === id || source.startsWith(`${id}/`) ? `\0${source}` : undefined,
    load: loaded => loaded.startsWith(`\0${id}`) ? code(loaded.slice(1)) : undefined,
  };
  return { names, routes, plugin };
}
