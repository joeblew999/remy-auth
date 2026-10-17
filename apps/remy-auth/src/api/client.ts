import { createRouterClient } from '@orpc/server';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { createServerOnlyFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { contract } from '@joeblew999/remy-auth-contract';
import { isomorphicClient } from '@joeblew999/remy-ui/api/client';
import { router } from './router';
import { apiContext } from './context.server';

/**
 * The typed client for remy-auth's own API, the same object on both sides: in a server loader
 * the router itself (no HTTP hop), in the browser HTTP to /api with every response validated
 * against the contract. The server half is server-only, so the router never ships. A call inside
 * the server has no HTTP request of its own, so its context is built from the page's request
 * (Start's getRequest): the page's cookies are what say who is signed in.
 */
export const client = isomorphicClient(contract, {
  server: createServerOnlyFn(() => createRouterClient(router, { context: () => apiContext(getRequest()) })),
});

/** TanStack Query options from the contract: `orpc.status.queryOptions()`, `orpc.reservations.create.mutationOptions()`; keys come from the contract's paths. */
export const orpc = createTanstackQueryUtils(client);
