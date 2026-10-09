// Which environment this is, and what that permits: one table per app, one row per capability, one
// column per environment (remy-sport's src/environment.ts, for every Remy app). The environment is
// declared (the Worker's ENVIRONMENT variable), never inferred, and an absent or unknown one is
// production: a deployment that forgets to say what it is loses a convenience, never opens a door.
// Plain JavaScript, so a Worker and the checks that run in Node share it.

/**
 * An app's environment table: `environments({ production: {...}, local: {...} })`. `production` is
 * required and is what any environment the table does not list resolves to. Answers
 * `environmentOf(env)` (the declared environment, or "production"), `policyFor(env)` (its row) and
 * `permits(env, 'capability')` (one capability, typed by the table).
 */
export function environments(table) {
  if (!Object.hasOwn(table, 'production')) throw new Error('environments: the table needs a production column, which is what an unknown environment resolves to');
  const environmentOf = env => (typeof env?.ENVIRONMENT === 'string' && Object.hasOwn(table, env.ENVIRONMENT) ? env.ENVIRONMENT : 'production');
  const policyFor = env => table[environmentOf(env)];
  return { table, environmentOf, policyFor, permits: (env, capability) => policyFor(env)[capability] };
}
