// The guard for the installed oRPC (issue #38): what an app's router imports. The rules
// themselves are ./guard-core.ts, which imports no oRPC and so runs on either major. Packed
// (vite.config.ts), because an app's checks load its router in Node, and Node does not read TypeScript from node_modules.
import { ORPCError, os } from '@orpc/server';
import type { DecoratedMiddleware } from '@orpc/server';
import type { GuardRelations } from './guard-core.ts';
import { guardMiddleware, markGuard } from './guard-core.ts';

export * from './guard-core.ts';
export { personal, policy } from './policy.ts';

/**
 * What the guard needs in every call's context: the caller's session, or null, looked up only when
 * a procedure's policy asks (so a public read costs no lookup) and at most once per call (`once`).
 * The name and the shape are those of oRPC's Better Auth guide.
 */
export type GuardContext<TUser> = {
  getSession: () => Promise<{ user: TUser } | null>;
  /** The app's relation engine (`relationEngine(vocabulary, db)`), for procedures whose policy is an action. */
  relations?: GuardRelations;
};

/**
 * The router's root middleware: `implement(contract).$context<...>().use(guard<User>())`. At the root
 * it wraps validation, so a stranger is refused before the input is read. It enforces each
 * procedure's policy and refuses a procedure that declares none. Handlers run with `context.user`:
 * the signed-in person under "session", null under "public".
 */
export function guard<TUser>(): DecoratedMiddleware<GuardContext<TUser>, { user: TUser | null }, unknown, any, any> {
  return markGuard(os.$context<GuardContext<TUser>>().middleware(guardMiddleware({ ORPCError })));
}

/**
 * The guard's context for an app that signs nobody in: every caller is a stranger, so its "public"
 * procedures run and anything else is refused. `apiHandlers(router, { context: () => noSession })`.
 */
export const noSession: GuardContext<never> = { getSession: async () => null };

/**
 * The session lookup for a call's context, from a function that reads it (Better Auth's
 * `auth.api.getSession({ headers })`): run at most once per call, and only when a policy asks.
 */
export function once<T>(lookup: () => Promise<T>): () => Promise<T> {
  let found: Promise<T> | undefined;
  return () => (found ??= lookup());
}

/** The signed-in person a "session" procedure runs for. Under any other policy there is none, and this refuses (401). */
export function signedIn<TUser>(context: { user: TUser | null }): TUser {
  if (!context.user) throw new ORPCError('UNAUTHORIZED', { message: 'Sign in to call this.' });
  return context.user;
}
