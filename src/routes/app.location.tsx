import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { LocationPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { getPlace } from '../place';
import { usePreferred } from '../preferred';
import { DeferredPlace } from '../showcase/deferred-place';
import { problemPages } from '../problem';

// Cloudflare's location of the request (streamed) beside the device's own (asked in the browser).
export const Route = createFileRoute('/app/location')({
  loader: () => ({ place: getPlace() }),
  head: () => pageHead({ path: '/app/location', title: locale => m.location_title({}, { locale }), description: locale => m.location_description({}, { locale }) }),
  component: Location,
  ...problemPages,
});

function Location() {
  const { place } = Route.useLoaderData();
  const locale = getLocale();
  return <LocationPage locale={locale} preferred={usePreferred()}><DeferredPlace locale={locale} place={place} device /></LocationPage>;
}
