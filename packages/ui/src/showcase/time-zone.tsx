import { Link } from '@tanstack/react-router';
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from '../components/breadcrumb';
import type { Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { Shell } from '../shell';
import { Group, Row } from '../rows';
import { samples } from '../samples.js';
import { formatLocale } from '../locale-info';

// A time zone as a sub-resource of the formats page: /<locale>/time-zones/<IANA name>, a splat
// because the names contain slashes. The route's loader resolves the name with
// `canonicalTimeZone` and throws notFound() when the runtime does not know it, so an unknown
// zone is a localized 404 rather than a page with broken values.

/** The de-localized path of a time zone's page. */
export const timeZonePath = (zone: string) => `/time-zones/${zone}`;

/**
 * The runtime's own spelling of a time zone name (case normalized, for example asia/tokyo is
 * Asia/Tokyo), or undefined when Intl does not know it. Pure: the server and the browser agree.
 */
export function canonicalTimeZone(name: string | undefined): string | undefined {
  if (!name) return undefined;
  try { return new Intl.DateTimeFormat('en', { timeZone: name }).resolvedOptions().timeZone; }
  catch { return undefined; }
}

/** One part of a zone's name in a language: 'longGeneric' (Japan Time) or 'longOffset' (GMT+09:00), at the sample instant. */
export function timeZoneName(locale: Locale, zone: string, style: 'longGeneric' | 'longOffset') {
  return new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style }).formatToParts(samples.instant)
    .find(part => part.type === 'timeZoneName')?.value ?? zone;
}

/** The page: the zone's name in the page's language, its identifier, offset and the sample instant there. */
export function TimeZonePage({ locale, zone, preferred }: { locale: Locale; zone: string; preferred?: Locale }) {
  const o = { locale };
  return <Shell locale={locale} path={timeZonePath(zone)} preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem><BreadcrumbLink render={<Link to="/" preload="intent" />}>{m.home_link({}, o)}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem><BreadcrumbLink render={<Link to="/formats" preload="intent" />}>{m.nav_formats({}, o)}</BreadcrumbLink></BreadcrumbItem>
          <BreadcrumbSeparator/>
          <BreadcrumbItem><BreadcrumbPage>{timeZoneName(locale, zone, 'longGeneric')}</BreadcrumbPage></BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.formats_label({}, o)}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{timeZoneName(locale, zone, 'longGeneric')}</h1>
      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{m.zone_intro({}, o)}</p>
      <Group title={m.timezone_heading({}, o)}>
        <Row sample="zone" label={m.zone_id_label({}, o)}><bdi>{zone}</bdi></Row>
        <Row sample="zone-offset" label={m.utc_offset_label({}, o)}>{timeZoneName(locale, zone, 'longOffset')}</Row>
        <Row sample="zone-local" label={m.cf_local_time_label({}, o)}>{new Intl.DateTimeFormat(formatLocale(locale), { dateStyle: 'full', timeStyle: 'long', timeZone: zone }).format(samples.instant)}</Row>
      </Group>
    </section>
  </Shell>;
}
