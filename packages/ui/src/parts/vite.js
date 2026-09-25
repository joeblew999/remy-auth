// The parts' Vite side (.plans/parts.md, candidate 2): a plugin that generates `virtual:remy-parts`
// from the app's list, and the route config that mounts each listed part's route directory beside
// the app's own routes through TanStack's virtual file routes (physical()). A part left out of the
// list leaves no route, no server function and no bundle code behind.
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { physical, rootRoute } from '@tanstack/virtual-file-routes';
import { catalog, readParts } from './list.js';

const id = 'virtual:remy-parts';
const here = dirname(fileURLToPath(import.meta.url));

/**
 * `const parts = remyParts()` in vite.config.ts, then `parts.plugin` among the plugins and
 * `tanstackStart({ router: { virtualRouteConfig: parts.routes } })`.
 * `routesDirectory` is the app's (TanStack's default, src/routes) with its `__root.tsx`.
 */
export function remyParts({ root = process.cwd(), file, routesDirectory = 'src/routes' } = {}) {
  const names = readParts({ root, file });
  const routesDir = resolve(root, routesDirectory);
  const routes = rootRoute('__root.tsx', [
    physical('', '.'),
    ...names.filter(name => catalog[name].routes).map(name => physical('', relative(routesDir, join(here, name, 'routes')))),
  ]);
  const plugin = {
    name: 'remy-parts',
    resolveId: source => source === id ? `\0${id}` : undefined,
    load: loaded => loaded === `\0${id}` ? `export const parts = ${JSON.stringify(names)};\nexport const hasPart = name => parts.includes(name);\n` : undefined,
  };
  return { names, routes, plugin };
}
