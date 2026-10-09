/** Just enough of a Worker's bindings to answer: its declared environment. */
export type HasEnvironment = { ENVIRONMENT?: string } | null | undefined;

/**
 * An app's environment table. Every column holds the same capabilities; `production` is required,
 * and any environment the table does not list is production.
 */
export declare function environments<const TTable extends { production: Record<string, unknown> } & Record<string, Record<keyof TTable['production'], unknown>>>(table: TTable): {
  table: TTable;
  /** The declared environment, or "production" for anything absent or unknown. */
  environmentOf(env: HasEnvironment): keyof TTable & string;
  /** What this environment permits. */
  policyFor(env: HasEnvironment): TTable[keyof TTable];
  /** One capability, read by name. */
  permits<K extends keyof TTable['production']>(env: HasEnvironment, capability: K): TTable[keyof TTable][K];
};
