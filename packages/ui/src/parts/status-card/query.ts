import type { QueryFunction, QueryKey } from '@tanstack/react-query';

/** What the status card shows: the Worker's /healthz fields, as the app's API returns them. */
export type Status = { status: string; service: string; release: string };

/**
 * What an app's src/parts/status-card.ts exports as `statusQuery`: TanStack Query options for its
 * status endpoint, for example `orpc.status.queryOptions()` from its contract. The part sets the timing.
 */
export type StatusQuery = { queryKey: QueryKey; queryFn: QueryFunction<Status, QueryKey> };
