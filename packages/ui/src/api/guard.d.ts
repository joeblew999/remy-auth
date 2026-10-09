import type { DecoratedMiddleware } from '@orpc/server';

export * from './guard-core.js';
export { personal, policy } from './policy.js';

/**
 * What the guard needs in every call's context: the caller's session, or null, looked up only when
 * a procedure's policy asks (so a public read costs no lookup) and at most once per call (`once`).
 * The name and the shape are those of oRPC's Better Auth guide.
 */
export type GuardContext<TUser> = { getSession: () => Promise<{ user: TUser } | null> };

export declare function guard<TUser>(): DecoratedMiddleware<GuardContext<TUser>, { user: TUser | null }, unknown, any, any>;
export declare const noSession: GuardContext<never>;
export declare function once<T>(lookup: () => Promise<T>): () => Promise<T>;
export declare function signedIn<TUser>(context: { user: TUser | null }): TUser;
