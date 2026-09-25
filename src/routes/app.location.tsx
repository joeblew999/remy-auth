import { createFileRoute } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { LocationPage } from '@joeblew999/remy-ui/app-pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { usePreferred } from '@joeblew999/remy-ui/preferred';
import { DevicePlace } from '@joeblew999/remy-ui/showcase/device-place';
// The deferred-place part, or undefined when the app does not list it (src/parts.json).
import { getPlace } from 'virtual:remy-parts/deferred-place/place';
import { DeferredPlace } from 'virtual:remy-parts/deferred-place/ui';
import { problemPages } from '@joeblew999/remy-ui/problem';

// Cloudflare's location of the request (streamed; the deferred-place part) beside the device's own
// (asked in the browser); without the part, the device's own alone, as in a prerendered app.
export const Route = createFileRoute('/app/location')({
  loader: () => ({ place: getPlace?.() }),
  head: () => pageHead({ path: '/app/location', title: locale => m.location_title({}, { locale }), description: locale => m.location_description({}, { locale }) }),
  component: Location,
  ...problemPages,
});

function Location() {
  const { place } = Route.useLoaderData();
  const locale = getLocale();
  return <LocationPage locale={locale} preferred={usePreferred()}>
    {DeferredPlace && place ? <DeferredPlace locale={locale} place={place} device /> : <DevicePlace locale={locale} />}
  </LocationPage>;
}
