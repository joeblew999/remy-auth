import type { QueryFunction, QueryKey } from '@tanstack/react-query';
import type { LiveStatus } from '../../showcase/status-card';

/**
 * What an app's src/parts/status-card.ts exports as `statusQuery`: TanStack Query options for its
 * status endpoint, for example `orpc.status.queryOptions()` from its contract. The part sets the timing.
 */
export type StatusQuery = { queryKey: QueryKey; queryFn: QueryFunction<LiveStatus, QueryKey> };
