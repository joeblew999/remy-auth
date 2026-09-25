// The contract coverage rule (.plans/openapi-contracts.md, "Type safety, layer by layer", 4): walk
// an oRPC contract or implemented router and list every procedure that lacks what an endpoint
// needs. Plain JavaScript, like ../checks.js, so Playwright loads it from node_modules too.
import { isContractProcedure } from '@orpc/contract';

/** Where every contract route lives: the app mounts one Start server route there (src/routes/api.$.ts). */
export const apiPrefix = '/api/';

/** Every procedure in a contract or router, with its dotted path ("reservations.create"). */
export function procedures(router, path = []) {
  if (isContractProcedure(router)) return [{ path: path.join('.'), procedure: router }];
  if (!router || typeof router !== 'object') return [];
  return Object.entries(router).flatMap(([key, child]) => procedures(child, [...path, key]));
}

/**
 * What is missing, one sentence per gap; empty when every procedure has a route (method and a path
 * under /api/, unique), a policy (`meta.policy`: who may call it), an output schema, and, when it
 * takes input, at least one documented error with an HTTP error status and a message.
 */
export function coverageProblems(router) {
  const problems = [];
  const routes = new Map();
  const found = procedures(router);
  if (found.length === 0) problems.push('the router has no procedures');
  for (const { path, procedure } of found) {
    const { route = {}, meta = {}, errorMap = {}, inputSchema, outputSchema } = procedure['~orpc'];
    if (!route.method) problems.push(`${path}: no HTTP method`);
    if (!route.path?.startsWith(apiPrefix)) problems.push(`${path}: no path under ${apiPrefix}`);
    const key = `${route.method} ${route.path}`;
    if (routes.has(key)) problems.push(`${path}: ${key} is also ${routes.get(key)}`);
    routes.set(key, path);
    if (typeof meta.policy !== 'string' || !meta.policy) problems.push(`${path}: no policy`);
    if (!outputSchema) problems.push(`${path}: no output schema`);
    const errors = Object.entries(errorMap).filter(([, error]) => error);
    if (inputSchema && errors.length === 0) problems.push(`${path}: takes input but documents no error`);
    for (const [code, error] of errors) {
      if (!(error.status >= 400 && error.status < 600)) problems.push(`${path}: error ${code} has no HTTP error status`);
      if (!error.message) problems.push(`${path}: error ${code} has no message`);
    }
  }
  return problems;
}
