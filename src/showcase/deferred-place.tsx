import { Await, Link } from '@tanstack/react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import type { Place } from '@joeblew999/remy-ui/cloudflare';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { formatLocale } from '@joeblew999/remy-ui/locale-info';
import { Group, Row } from '@joeblew999/remy-ui/pages';
import { Skeleton as Placeholder } from '@joeblew999/remy-ui/components/skeleton';
import { DevicePlace } from '@joeblew999/remy-ui/showcase/device-place';

/**
 * Cloudflare's view of the visitor, streamed: the loader returns the place unawaited, the page's
 * first bytes leave without it, and this group arrives later in the same response. Until then a
 * skeleton with the same labels holds its space. Crawlers get the whole document at once
 * (TanStack waits for everything when the user agent is a bot).
 */
export function DeferredPlace({ locale, place, device = false }: { locale: Locale; place: Promise<Place>; device?: boolean }) {
  // Cloudflare's note stays with Cloudflare's group; the device's own location follows it.
  const note = <p className="text-sm leading-relaxed text-muted-foreground">{m.location_note({}, { locale })}</p>;
  return <Await promise={place} fallback={<><PlaceSkeleton locale={locale} />{note}</>}>
    {value => <><PlaceGroup locale={locale} place={value} />{note}{device && <DevicePlace locale={locale} network={value} />}</>}
  </Await>;
}

function PlaceGroup({ locale, place }: { locale: Locale; place: Place }) {
  const o = { locale };
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  const unknown = m.location_unknown({}, o);
  const localTime = (() => {
    try { return place.timeZone ? new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: 'full', timeStyle: 'long', timeZone: place.timeZone }).format(samples.instant) : unknown; }
    catch { return unknown; }
  })();
  return <Group title={m.location_heading({}, o)}>
    <Row sample="country" label={m.your_country_label({}, o)} data-country={place.country}>{place.country ? regionName.of(place.country) : unknown}</Row>
    <Row sample="place" label={m.place_label({}, o)}>{[place.city, place.region].filter(Boolean).join(', ') || unknown}</Row>
    <Row sample="cf-timezone" label={m.cf_timezone_label({}, o)} data-timezone={place.timeZone}>{place.timeZone
      ? <Link className="underline underline-offset-4" to="/time-zones/$" params={{ _splat: place.timeZone }} preload="intent">{place.timeZone}</Link>
      : unknown}</Row>
    <Row sample="cf-local" label={m.cf_local_time_label({}, o)}>{localTime}</Row>
  </Group>;
}

/** The same group while the place is on its way: real labels, pulsing values, no data-sample (the checks read only real rows). */
function PlaceSkeleton({ locale }: { locale: Locale }) {
  const o = { locale };
  const labels = [m.your_country_label({}, o), m.place_label({}, o), m.cf_timezone_label({}, o), m.cf_local_time_label({}, o)];
  return <div className="place-skeleton" aria-busy="true">
    <Group title={m.location_heading({}, o)}>
      {labels.map(label => <Skeleton key={label} label={label} />)}
    </Group>
  </div>;
}

function Skeleton({ label }: { label: string }) {
  return <><dt className="text-muted-foreground">{label}</dt>
    <dd><Placeholder aria-hidden="true" className="h-4 w-3/4" /></dd></>;
}
