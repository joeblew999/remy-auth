import { weekdayName, localeInfo } from '@joeblew999/remy-ui/locale-info';
import { placeFromCloudflare } from '@joeblew999/remy-ui/cloudflare';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { FormatsPage, Group, Row } from '@joeblew999/remy-ui/pages';
import { requireLocale } from '@joeblew999/remy-ui/react-router';
import { cloudflareContext } from '../context';
import { pageMeta } from '../seo';
import { usePreferred } from '../preferred';
import type { Route } from './+types/formats';

export function loader({ params, context }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  // Cloudflare's request geolocation: the network's country, region, city and time zone.
  return { locale, info: localeInfo(locale), place: placeFromCloudflare(context.get(cloudflareContext).cf) };
}
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '/formats', locale => m.formats_title({}, { locale }), locale => m.formats_description({}, { locale }));
}

// The shared page, plus rows only this server-rendered app has: Cloudflare's view of the
// visitor and further Intl examples.
export default function Formats({ loaderData: { locale, info, place } }: Route.ComponentProps) {
  const o = { locale };
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  const unknown = m.location_unknown({}, o);
  const localTime = (() => {
    try { return place.timeZone ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: place.timeZone }).format(samples.instant) : unknown; }
    catch { return unknown; }
  })();
  return <FormatsPage locale={locale} info={info} preferred={usePreferred()} extras={{
    language: <Row sample="region" label={m.region_label({}, o)}>{regionName.of(samples.region)}</Row>,
    beforeSystems: <>
      <Group title={m.location_heading({}, o)}>
        <Row sample="country" label={m.your_country_label({}, o)} data-country={place.country}>{place.country ? regionName.of(place.country) : unknown}</Row>
        <Row sample="place" label={m.place_label({}, o)}>{[place.city, place.region].filter(Boolean).join(', ') || unknown}</Row>
        <Row sample="cf-timezone" label={m.cf_timezone_label({}, o)} data-timezone={place.timeZone}>{place.timeZone ?? unknown}</Row>
        <Row sample="cf-local" label={m.cf_local_time_label({}, o)}>{localTime}</Row>
      </Group>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.location_note({}, o)}</p>
    </>,
    systems: <>
      {info.weekend && <Row sample="weekend" label={m.weekend_label({}, o)}>{list.format(info.weekend.map(day => weekdayName(locale, day)))}</Row>}
      <Row sample="other-calendars" label={m.other_calendars_label({}, o)}>
        {info.otherCalendars.length === 0 ? m.no_other_calendars({}, o) : <ul className="flex flex-col gap-1">
          {info.otherCalendars.map(calendar => <li key={calendar} data-calendar={calendar}>
            {calendarName.of(calendar)}: {new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar, timeZone: 'UTC' }).format(samples.date)}
          </li>)}
        </ul>}
      </Row>
    </>,
    dates: <Row sample="range" label={m.range_label({}, o)}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd)}</Row>,
    currency: <>
      <Row sample="currencies" label={m.currencies_label({}, o)}>{list.format(samples.currencies.map(currency => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(samples.amount)))}</Row>
      <Row sample="currency-name" label={m.currency_name_label({}, o)}>{new Intl.DisplayNames([locale], { type: 'currency' }).of('EUR')}</Row>
    </>,
    after: <>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.currency_note({}, o)}</p>
      <Group title={m.units_heading({}, o)}>
        <Row sample="distance" label={m.distance_label({}, o)}>{m.distance_value({ km: samples.km }, o)}</Row>
      </Group>
      <Group title={m.variants_heading({}, o)}>
        <Row sample="greeting" label={m.greeting_label({}, o)}>{m.greeting({ name: samples.guest }, o)}</Row>
        {samples.statuses.map(status => <Row key={status} sample={`status-${status}`} label={m.status_label({}, o)}>{m.invite_status({ status }, o)}</Row>)}
      </Group>
      <Group title={m.sorting_heading({}, o)}>
        <Row sample="sorted" label={m.sorted_label({}, o)}>{list.format([...samples.names].sort(new Intl.Collator(locale).compare))}</Row>
      </Group>
    </>,
  }} />;
}
