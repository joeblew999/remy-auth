import type { QueryClient } from '@tanstack/react-query';
import { getLocale } from '../../locale';
import { StatusCard as SharedStatusCard, statusRefreshMs } from '../../showcase/status-card';
// The app's own status query (its src/parts/status-card.ts): the package does not know the app's API.
import { statusQuery as appStatusQuery } from 'virtual:remy-parts/status-card/app';

// The status-card part (.plans/parts.md): this Worker's own status in the package's card
// (../../showcase/status-card.tsx, which a consumer also mounts with another origin's query). Apps
// import it as `virtual:remy-parts/status-card/ui`, which is `undefined` when the app does not list the part.

/** The app's query, fresh for the card's interval; the app must provide it when it lists the part. */
const statusQuery = () => {
  if (!appStatusQuery) throw new Error('the status-card part needs the app\'s statusQuery (src/parts/status-card.ts)');
  return { ...appStatusQuery, staleTime: statusRefreshMs };
};

/** The loader of a route that shows the card: fills the request's QueryClient, so the server HTML holds the status. */
export const statusCardLoader = async ({ context }: { context: { queryClient: QueryClient } }) => {
  await context.queryClient.ensureQueryData(statusQuery());
};

/** This Worker's own status, server-rendered by the loader above. */
export function StatusCard() {
  return <SharedStatusCard locale={getLocale()} query={statusQuery()} />;
}
