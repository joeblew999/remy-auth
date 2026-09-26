import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { ClockPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { problemPages } from '@joeblew999/remy-ui/problem';

// The clock: the chosen zones live in the address (?zones=Asia/Tokyo,Europe/London), so a set is a link.
const defaults = { zones: 'Europe/London,Asia/Tokyo' };
export const Route = createFileRoute('/app/clock')({
  // A plain function, not a Zod schema: this loads with every page, and full Zod probes eval (the CSP's no).
  validateSearch: (search: Record<string, unknown>) => ({ zones: typeof search.zones === 'string' ? search.zones : defaults.zones }),
  search: { middlewares: [stripSearchParams(defaults)] },
  head: () => pageHead({ path: '/app/clock', title: locale => m.clock_title({}, { locale }), description: locale => m.clock_description({}, { locale }) }),
  component: Clock,
  ...problemPages,
});

function Clock() {
  const navigate = Route.useNavigate();
  const zones = Route.useSearch().zones.split(',').filter(Boolean);
  return <ClockPage locale={getLocale()} preferred={usePreferred()} zones={zones}
    onZonesChange={next => navigate({ search: { zones: next.join(',') }, replace: true })} />;
}
