// Every listed part's checks, from one line in an app's test file: partChecks(). Each part's folder has a
// checks.js whose default export runs them (the platform's parts here, another package's in that package), loaded
// for the app's own src/parts.json when this module loads, so partChecks() declares its tests at once.
// Plain JavaScript, like ../checks.js; a part left out of src/parts.json leaves no check behind.
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { listedParts } from './list.js';

const listed = listedParts();
const checks = Object.fromEntries(await Promise.all(Object.entries(listed).map(async ([name, part]) =>
  [name, (await import(pathToFileURL(join(part.dir, 'checks.js')).href)).default])));

/** `options` maps a part's name to its checks' options. */
export function partChecks({ options = {} } = {}) {
  for (const [name, run] of Object.entries(checks)) run(options[name], listed);
}
