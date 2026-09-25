import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { HomePage } from '@joeblew999/remy-ui/pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '../preferred';
import { withStatusCard } from '../showcase/status-card';

export const Route = createFileRoute('/')({
  head: () => pageHead({ path: '', title: locale => m.home_title({}, { locale }), description: locale => m.home_description({}, { locale }) }),
  ...withStatusCard(Home),
});

function Home() {
  return <HomePage locale={getLocale()} preferred={usePreferred()} />;
}
