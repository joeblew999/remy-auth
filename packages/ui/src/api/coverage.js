// The contract coverage rule (.plans/openapi-contracts.md, "Type safety, layer by layer", 4): walk
// an oRPC contract or implemented router and list every procedure that lacks what an endpoint
// needs. Plain JavaScript, like ../checks.js, so Playwright loads it from node_modules too.
import { COMMON_ERROR_STATUS_MAP, getOpenAPIMeta } from '@orpc/openapi';
import { walk } from './guard-core.js';

/** Where every contract route lives: the app mounts one Start server route there (src/routes/api.$.ts). */
export const apiPrefix = '/api/';

/** Every procedure in a contract or router, with its dotted path ("reservations.create"). */
export const procedures = router => walk(router);

/** A procedure's HTTP route and document fields: its `openapi()` metadata (method, path, summary, tags). */
export const routeOf = procedure => getOpenAPIMeta(procedure) ?? {};

/** The HTTP status each error code answers with: oRPC's common codes, then the API's own (`errorStatuses`). */
export const statusesOf = (errorStatuses = {}) => ({ ...COMMON_ERROR_STATUS_MAP, ...errorStatuses });

/**
 * What is missing, one sentence per gap; empty when every procedure has a route (method and a path
 * under /api/, unique), a policy (`meta.policy`: who may call it), an output schema, and, when it
 * takes input, at least one documented error; and every documented error has a message and an HTTP
 * error status (one of oRPC's common codes, or listed in the API's `errorStatuses`).
 */
export function coverageProblems(router, { errorStatuses } = {}) {
  const problems = [];
  const routes = new Map();
  const statuses = statusesOf(errorStatuses);
  const found = procedures(router);
  if (found.length === 0) problems.push('the router has no procedures');
  for (const { path, procedure } of found) {
    const { meta = {}, errorMap = {}, inputSchemas = [], outputSchemas = [] } = procedure['~orpc'];
    const route = routeOf(procedure);
    if (!route.method) problems.push(`${path}: no HTTP method`);
    if (!route.path?.startsWith(apiPrefix)) problems.push(`${path}: no path under ${apiPrefix}`);
    const key = `${route.method} ${route.path}`;
    if (routes.has(key)) problems.push(`${path}: ${key} is also ${routes.get(key)}`);
    routes.set(key, path);
    if (typeof meta.policy !== 'string' || !meta.policy) problems.push(`${path}: no policy`);
    if (outputSchemas.length === 0) problems.push(`${path}: no output schema`);
    const errors = Object.entries(errorMap).filter(([, error]) => error);
    if (inputSchemas.length > 0 && errors.length === 0) problems.push(`${path}: takes input but documents no error`);
    for (const [code, error] of errors) {
      if (!(statuses[code] >= 400 && statuses[code] < 600)) problems.push(`${path}: error ${code} has no HTTP error status`);
      if (!error.message) problems.push(`${path}: error ${code} has no message`);
    }
  }
  return problems;
}
