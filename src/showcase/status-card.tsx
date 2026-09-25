import { queryOptions, useQuery, type QueryClient } from '@tanstack/react-query';
import { useRouter } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@joeblew999/remy-ui/components/card';
import { invalidateEverything } from '../invalidate';
import { getStatus } from './status';

/** How often an open page asks again, and how long an answer counts as fresh (so hydration does not refetch at once). */
export const statusRefreshMs = 10_000;

/** The live status as a query: the server function on the server during SSR, an RPC to it in the browser. */
export const statusQuery = queryOptions({
  queryKey: ['status'],
  queryFn: () => getStatus(),
  staleTime: statusRefreshMs,
});

/** The loader of a route that shows the card: fills the request's QueryClient, so the server HTML holds the status. */
export const statusCardLoader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  await context.queryClient.ensureQueryData(statusQuery);
};

/** The Worker's status, release and service; polls while the page is open and visible. */
export function StatusCard() {
  const locale = getLocale();
  const o = { locale };
  const router = useRouter();
  const { data, dataUpdatedAt, isFetching } = useQuery({ ...statusQuery, refetchInterval: statusRefreshMs });
  return <aside aria-labelledby="live-status" className="status-card mt-6">
    <Card data-status={data?.status} data-updated={dataUpdatedAt || undefined} aria-busy={isFetching}>
      <CardHeader><CardTitle><h2 id="live-status">{m.live_status_heading({}, o)}</h2></CardTitle></CardHeader>
      <CardContent className="flex flex-col gap-4">
        <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">
          <dt className="text-muted-foreground">{m.live_status_label({}, o)}</dt>
          <dd data-live="status">{data?.status === 'ok' ? m.live_status_ok({}, o) : '…'}</dd>
          <dt className="text-muted-foreground">{m.live_service_label({}, o)}</dt>
          <dd data-live="service"><code>{data?.service ?? '…'}</code></dd>
          <dt className="text-muted-foreground">{m.live_release_label({}, o)}</dt>
          <dd data-live="release" className="[overflow-wrap:anywhere]"><code>{data?.release ?? '…'}</code></dd>
        </dl>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-xs leading-relaxed text-muted-foreground">{m.live_status_note({}, o)}</p>
          <Button variant="outline" size="sm" onClick={() => invalidateEverything(router)}>{m.live_refresh({}, o)}</Button>
        </div>
      </CardContent>
    </Card>
  </aside>;
}
