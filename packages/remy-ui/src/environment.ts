// Which environment this is, and what that permits: one table per app, one row per capability, one
// column per environment (remy-sport's src/environment.ts, for every Remy app). The environment is
// declared (the Worker's ENVIRONMENT variable), never inferred, and an absent or unknown one is
// production: a deployment that forgets to say what it is loses a convenience, never opens a door.
// Packed (vite.config.ts), so a Worker and the checks that run in Node share it.

/**
 * An app's environment table: `environments({ production: {...}, local: {...} })`. `production` is
 * required and is what any environment the table does not list resolves to. Answers
 * `environmentOf(env)` (the declared environment, or "production"), `policyFor(env)` (its row) and
 * `permits(env, 'capability')` (one capability, typed by the table).
 */
/** Just enough of a Worker's bindings to answer: its declared environment. */
export type HasEnvironment = { ENVIRONMENT?: string } | null | undefined;

export function environments<
  const TTable extends { production: Record<string, unknown> } & Record<
    string,
    Record<keyof TTable['production'], unknown>
  >,
>(
  table: TTable,
): {
  table: TTable;
  /** The declared environment, or "production" for anything absent or unknown. */
  environmentOf: (env: HasEnvironment) => keyof TTable & string;
  /** What this environment permits. */
  policyFor: (env: HasEnvironment) => TTable[keyof TTable];
  /** One capability, read by name. */
  permits: <K extends keyof TTable['production']>(env: HasEnvironment, capability: K) => TTable[keyof TTable][K];
} {
  if (!Object.hasOwn(table, 'production'))
    throw new Error(
      'environments: the table needs a production column, which is what an unknown environment resolves to',
    );
  const environmentOf = (env: HasEnvironment): keyof TTable & string =>
    typeof env?.ENVIRONMENT === 'string' && Object.hasOwn(table, env.ENVIRONMENT) ? env.ENVIRONMENT : 'production';
  const policyFor = (env: HasEnvironment): TTable[keyof TTable] => table[environmentOf(env)];
  return {
    table,
    environmentOf,
    policyFor,
    permits: <K extends keyof TTable['production']>(env: HasEnvironment, capability: K) =>
      policyFor(env)[capability as keyof TTable[keyof TTable]] as TTable[keyof TTable][K],
  };
}
