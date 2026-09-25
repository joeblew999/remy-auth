import type { QueryClient } from '@tanstack/react-query';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { StatusCard as SharedStatusCard, statusRefreshMs } from '@joeblew999/remy-ui/showcase/status-card';
import { orpc } from '../api/client';

/**
 * The live status as a query on the contract's GET /api/status: the router itself on the server
 * during SSR, HTTP with the response checked against the contract in the browser.
 */
export const statusQuery = orpc.status.queryOptions({ staleTime: statusRefreshMs });

/** The loader of a route that shows the card: fills the request's QueryClient, so the server HTML holds the status. */
export const statusCardLoader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  await context.queryClient.ensureQueryData(statusQuery);
};

/** This Worker's own status in the package's card (@joeblew999/remy-ui/showcase/status-card). */
export function StatusCard() {
  return <SharedStatusCard locale={getLocale()} query={statusQuery} />;
}
