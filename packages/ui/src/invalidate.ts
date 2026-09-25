import type { RegisteredRouter } from '@tanstack/react-router';

/**
 * Makes everything cached for the current viewer stale and reloads what is on screen: every
 * route loader (the router's cache) and every query (the router's QueryClient). Call it after
 * logout and after a role or membership change, so no page keeps showing data the viewer may no
 * longer see (the auth plan's "Roles and relationships on TanStack").
 */
export async function invalidateEverything(router: RegisteredRouter): Promise<void> {
  await Promise.all([
    router.options.context.queryClient.invalidateQueries(),
    router.invalidate({ sync: true }),
  ]);
}
