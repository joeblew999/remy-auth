import type { Vocabulary } from './relations.js';

/**
 * Who may call a procedure: anyone ("public"), only a signed-in person ("session"), or a signed-in
 * person holding a relation the app's vocabulary grants `action` to, on the object whose id the
 * input's `id` field holds (another field when `id` names it).
 */
export type Policy = 'public' | 'session' | { action: string; id?: string };
export declare const policies: readonly string[];
export declare function actionOf(policy: unknown): string | undefined;

/** The part of the relation engine the guard asks (./relations.js). */
export type GuardRelations = {
  can(action: any, user: any, objectId: string | null): Promise<boolean>;
  objectTableFor(action: any): string | null;
  objectExists(table: string, id: string): Promise<boolean>;
};
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
  context: { getSession: () => Promise<{ user: unknown } | null>; relations?: GuardRelations };
  next: (options: { context: { user: unknown } }) => unknown;
};
/** The root middleware for the oRPC whose `ORPCError` is handed in. */
export declare function guardMiddleware(orpc: { ORPCError: new (code: any, options?: any) => Error }): (options: GuardOptions, input?: unknown) => Promise<any>;
export declare function guardProblems(router: unknown, options?: { personFields?: readonly string[]; vocabulary?: Vocabulary }): string[];
