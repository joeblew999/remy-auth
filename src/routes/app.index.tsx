import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AppHomePage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
// The status-card part, or undefined when the app does not list it (src/parts.json).
import { StatusCard, statusCardLoader } from 'virtual:remy-parts/status-card/ui';
import { problemPages } from '@joeblew999/remy-ui/problem';

// The app's home: the live status card (TanStack Query; the status-card part) inside the app shell.
export const Route = createFileRoute('/app/')({
  // The loader goes with the component into this route's own chunk (TanStack's codeSplitGroupings):
  // it pulls in the API client and its contract (oRPC and Zod), which no other page's first load needs.
  codeSplitGroupings: [['loader', 'component']],
  loader: statusCardLoader,
  head: () => pageHead({ path: '/app', title: locale => m.app_home_title({}, { locale }), description: locale => m.app_home_description({}, { locale }) }),
  component: AppHome,
  ...problemPages,
});

function AppHome() {
  return <AppHomePage locale={getLocale()} preferred={usePreferred()}>{StatusCard && <StatusCard />}</AppHomePage>;
}
