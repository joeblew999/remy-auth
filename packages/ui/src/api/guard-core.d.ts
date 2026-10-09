/** Who may call a procedure: anyone ("public"), or only a signed-in person ("session"). */
export type Policy = 'public' | 'session';
export declare const policies: readonly Policy[];
export declare const personFields: readonly string[];
export declare function policyOf(procedure: unknown): Policy | undefined;
export declare function middlewaresOf(procedure: unknown): unknown[];
export declare function outputSchemasOf(procedure: unknown): unknown[];
export declare function walk(router: unknown): { path: string; procedure: unknown }[];
export declare function markGuard<T extends object>(middleware: T): T;
export declare function isGuarded(procedure: unknown): boolean;

/** What the guard's middleware is handed, on oRPC 1 and 2 alike. */
export type GuardOptions = {
  procedure: unknown;
  context: { getSession: () => Promise<{ user: unknown } | null> };
  next: (options: { context: { user: unknown } }) => unknown;
};
/** The root middleware for the oRPC whose `ORPCError` is handed in. */
export declare function guardMiddleware(orpc: { ORPCError: new (code: any, options?: any) => Error }): (options: GuardOptions) => Promise<any>;
export declare function guardProblems(router: unknown, options?: { personFields?: readonly string[] }): string[];
