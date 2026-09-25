// Every listed part's checks, from one line in an app's test file: partChecks().
// Plain JavaScript, like ../checks.js; a part left out of src/parts.json leaves no check behind.
import { readParts } from './list.js';
import { timeZonesChecks } from './time-zones/checks.js';

const checks = { 'time-zones': timeZonesChecks };

/** `options` maps a part's name to its checks' options. */
export function partChecks({ root, file, options = {} } = {}) {
  for (const name of readParts({ root, file })) checks[name](options[name]);
}
