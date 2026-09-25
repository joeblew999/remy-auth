// Every listed part's checks, from one line in an app's test file: partChecks().
// Plain JavaScript, like ../checks.js; a part left out of src/parts.json leaves no check behind.
import { partSitePaths, readParts } from './list.js';
import { timeZonesChecks } from './time-zones/checks.js';
import { deferredPlacePartChecks } from './deferred-place/checks.js';
import { seoRoutesChecks } from './seo-routes/checks.js';
import { statusCardChecks } from '../showcase/status-card.checks.js';

const checks = {
  'time-zones': timeZonesChecks,
  'deferred-place': deferredPlacePartChecks,
  // The sitemap also lists the site pages every listed part adds.
  'seo-routes': (options, names) => seoRoutesChecks({ ...options, partPaths: partSitePaths(names) }),
  'status-card': options => {
    if (!options?.service) throw new Error("status-card checks need the Worker's name: partChecks({ options: { 'status-card': { service } } })");
    statusCardChecks(options);
  },
};

/** `options` maps a part's name to its checks' options. */
export function partChecks({ root, file, options = {} } = {}) {
  const names = readParts({ root, file });
  for (const name of names) checks[name](options[name], names);
}
