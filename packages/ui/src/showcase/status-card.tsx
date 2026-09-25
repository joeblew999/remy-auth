import { useQuery, useQueryClient, type QueryKey, type UseQueryOptions } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import type { Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { Button } from '../components/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { invalidateEverything } from '../invalidate';

// The live status card (TanStack Query with the router): a Worker's liveness as a contract
// endpoint answers it (GET /api/status in @joeblew999/remy-auth-contract). The app owns the query,
// so the package never depends on an app's contract: remy-auth passes its own client's
// queryOptions (the router itself during SSR, HTTP in the browser); a consumer passes a
// contractClient's on remy-auth's origin, asked by the browser only. Checks: status-card.checks.js.

/** What the card shows: the contract's status output. */
export type LiveStatus = { status: 'ok'; service: string; release: string };

/** How often an open page asks again, and how long an answer counts as fresh (so hydration does not refetch at once). */
export const statusRefreshMs = 10_000;

/**
 * The status, service and release; polls while the page is open and visible, and its refresh
 * control invalidates every loader and query at once. An answer that breaks the contract (the
 * client's validation error) or no answer at all shows as an error, never as data.
 * `serverRendered` says whether the app's loader filled the query on the server; the note says
 * where the status came from.
 */
export function StatusCard<TError, TKey extends QueryKey>({ locale, query, serverRendered = true }: {
  locale: Locale;
  query: UseQueryOptions<LiveStatus, TError, LiveStatus, TKey>;
  serverRendered?: boolean;
}) {
  const o = { locale };
  const router = useRouter();
  const queryClient = useQueryClient();
  const { data, dataUpdatedAt, isFetching, isError } = useQuery({ ...query, refetchInterval: statusRefreshMs });
  const status = isError ? 'error' : data?.status;
  return <aside aria-labelledby="live-status" className="status-card mt-6">
    <Card data-status={status} data-updated={dataUpdatedAt || undefined} aria-busy={isFetching}>
      <CardHeader><CardTitle><h2 id="live-status">{m.live_status_heading({}, o)}</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{m.live_status_label({}, o)}</dt>
          <dd data-live="status">{status === 'ok' ? m.live_status_ok({}, o) : status === 'error' ? m.error_title({}, o) : '…'}</dd>
          <dt className="text-muted-foreground">{m.live_service_label({}, o)}</dt>
          <dd data-live="service"><code>{status === 'ok' ? data?.service : '…'}</code></dd>
          <dt className="text-muted-foreground">{m.live_release_label({}, o)}</dt>
          <dd data-live="release" className="[overflow-wrap:anywhere]"><code>{status === 'ok' ? data?.release : '…'}</code></dd>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{serverRendered ? m.live_status_note({}, o) : m.live_status_note_browser({}, o)}</p>
          <Button variant="outline" size="sm" onClick={() => invalidateEverything(router, queryClient)}>{m.live_refresh({}, o)}</Button>
        </div>
      </CardContent>
    </Card>
  </aside>;
}
