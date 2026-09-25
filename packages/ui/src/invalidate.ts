import type { QueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@tanstack/react-router';

/**
 * Makes everything cached for the current viewer stale and reloads what is on screen: every
 * route loader (the router's cache) and every query (the app's QueryClient). Call it after
 * logout and after a role or membership change, so no page keeps showing data the viewer may no
 * longer see (the auth plan's "Roles and relationships on TanStack"). In a component:
 * `invalidateEverything(useRouter(), useQueryClient())`.
 */
export async function invalidateEverything(router: AnyRouter, queryClient: QueryClient): Promise<void> {
  await Promise.all([
    queryClient.invalidateQueries(),
    router.invalidate({ sync: true }),
  ]);
}
