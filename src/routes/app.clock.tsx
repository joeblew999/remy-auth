import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { ClockPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';
import { clockDefaults, clockRouteOptions, clockZones } from '@joeblew999/remy-ui/clock-route';

// The clock (the shared ClockPage and its route options): the chosen zones live in the address.
export const Route = createFileRoute('/app/clock')({
  ...clockRouteOptions,
  search: { middlewares: [stripSearchParams(clockDefaults)] },
  head: () => pageHead({ path: '/app/clock', title: locale => m.clock_title({}, { locale }), description: locale => m.clock_description({}, { locale }) }),
  component: Clock,
  ...problemPages,
});

function Clock() {
  const navigate = Route.useNavigate();
  const zones = clockZones(Route.useSearch());
  return <ClockPage locale={getLocale()} preferred={usePreferred()} zones={zones}
    onZonesChange={next => navigate({ search: { zones: next.join(',') }, replace: true })} />;
}
