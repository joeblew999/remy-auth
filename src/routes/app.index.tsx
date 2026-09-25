import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { AppHomePage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '../preferred';
import { StatusCard, statusCardLoader } from '../showcase/status-card';
import { problemPages } from '../problem';

// The app's home: the live status card (TanStack Query) inside the app shell.
export const Route = createFileRoute('/app/')({
  loader: statusCardLoader,
  head: () => pageHead({ path: '/app', title: locale => m.app_home_title({}, { locale }), description: locale => m.app_home_description({}, { locale }) }),
  component: AppHome,
  ...problemPages,
});

function AppHome() {
  return <AppHomePage locale={getLocale()} preferred={usePreferred()}><StatusCard /></AppHomePage>;
}
