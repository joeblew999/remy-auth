import type { QueryFunction, QueryKey } from '@tanstack/react-query';
import type { LiveStatus } from './card';

/**
 * What an app's src/parts/status-card.ts exports as `statusQuery`: TanStack Query options for its
 * status endpoint, for example `orpc.status.queryOptions()` from its contract. The part sets the timing.
 */
export type StatusQuery = {
  queryKey: QueryKey;
  // The key's own type is the query library's (oRPC tags its keys), so the function takes whichever it made.
  queryFn: QueryFunction<LiveStatus, any>;
};
