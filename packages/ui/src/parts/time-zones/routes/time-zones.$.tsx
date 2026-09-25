import { createFileRoute, notFound, redirect } from '@tanstack/react-router';
import { getLocale } from '../../../locale';
import { m } from '../../../paraglide/messages.js';
import { pageHead } from '../../../tanstack';
import { TimeZonePage, canonicalTimeZone, timeZoneName, timeZonePath } from '../../../showcase/time-zone';
import { ErrorPage, Problem } from '../../../problem';
import { usePreferred } from '../../../preferred';

// A sub-resource of the formats page: /es/time-zones/Asia/Tokyo. The splat holds the IANA name;
// a name Intl does not know throws notFound() (a localized 404 naming it), and another spelling
// of a known one redirects permanently to the runtime's own spelling, so every zone has one URL.
export const Route = createFileRoute('/time-zones/$')({
  loader: ({ params }) => {
    const zone = canonicalTimeZone(params._splat);
    if (!zone) throw notFound();
    if (zone !== params._splat) throw redirect({ to: '/time-zones/$', params: { _splat: zone }, statusCode: 301 });
    return { zone };
  },
  head: ({ loaderData }) => loaderData ? pageHead({
    path: timeZonePath(loaderData.zone),
    title: locale => timeZoneName(locale, loaderData.zone, 'longGeneric'),
    description: locale => m.zone_description({}, { locale }),
  }) : {},
  notFoundComponent: MissingZone,
  errorComponent: ErrorPage,
  component: TimeZone,
});

function TimeZone() {
  const { zone } = Route.useLoaderData();
  return <TimeZonePage locale={getLocale()} zone={zone} preferred={usePreferred()} />;
}

// Loader data is not available here; the params always are.
function MissingZone() {
  const { _splat } = Route.useParams();
  return <Problem missing detail={m.zone_not_found({ zone: _splat ?? '' }, { locale: getLocale() })} />;
}
