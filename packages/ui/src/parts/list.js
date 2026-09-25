// The parts an app lists (.plans/parts.md): one name per line in the app's src/parts.json, read in
// plain Node by the Vite config (routes and the virtual module) and by Playwright (checks), so the
// browser bundle, the Worker, the routes and the checks all follow the same list.
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Every part the package offers. `routes`: the part has a route directory (`<name>/routes`),
 * mounted beside the app's own routes. `requires`: parts that must be listed too.
 */
export const catalog = {
  'time-zones': { routes: true, requires: [] },
};

/** The default list file, relative to the app's root. */
export const partsFile = 'src/parts.json';

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
