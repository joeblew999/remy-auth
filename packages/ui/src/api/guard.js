// The guard for the installed oRPC (.plans/auth-service.md): what an app's router imports. The rules
// themselves are ./guard-core.js, which imports no oRPC and so runs on either major. Plain JavaScript,
// because an app's checks load its router in Node, and Node does not read TypeScript from node_modules.
import { ORPCError, os } from '@orpc/server';
import { guardMiddleware, markGuard } from './guard-core.js';

export * from './guard-core.js';
export { personal, policy } from './policy.js';

/**
 * The router's root middleware: `implement(contract).$context<...>().use(guard<User>())`. At the root
 * it wraps validation, so a stranger is refused before the input is read. It enforces each
 * procedure's policy and refuses a procedure that declares none. Handlers run with `context.user`:
 * the signed-in person under "session", null under "public".
 */
export function guard() {
  return markGuard(os.$context().middleware(guardMiddleware({ ORPCError })));
}

/**
 * The guard's context for an app that signs nobody in: every caller is a stranger, so its "public"
 * procedures run and anything else is refused. `apiHandlers(router, { context: () => noSession })`.
 */
export const noSession = { getSession: async () => null };

/**
 * The session lookup for a call's context, from a function that reads it (Better Auth's
 * `auth.api.getSession({ headers })`): run at most once per call, and only when a policy asks.
 */
export function once(lookup) {
  let found;
  return () => found ??= lookup();
}

/** The signed-in person a "session" procedure runs for. Under any other policy there is none, and this refuses (401). */
export function signedIn(context) {
  if (!context.user) throw new ORPCError('UNAUTHORIZED', { message: 'Sign in to call this.' });
  return context.user;
}
