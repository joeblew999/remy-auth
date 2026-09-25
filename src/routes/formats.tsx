import { createFileRoute, stripSearchParams } from '@tanstack/react-router';
import { getLocale } from '@joeblew999/remy-ui/locale';
import { weekdayName, localeInfo } from '@joeblew999/remy-ui/locale-info';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { FormatsPage, Group, Row } from '@joeblew999/remy-ui/pages';
import { pageHead } from '@joeblew999/remy-ui/tanstack';
import { FormatsControls, validateSearch, searchDefaults } from '@joeblew999/remy-ui/showcase/search-params';
import { getPlace } from '../place';
import { usePreferred } from '../preferred';
import { DeferredPlace } from '../showcase/deferred-place';

export const Route = createFileRoute('/formats')({
  // ?currency, ?count and ?calendar, validated with defaults; defaults are left out of URLs.
  validateSearch,
  search: { middlewares: [stripSearchParams(searchDefaults)] },
  // Cloudflare's request geolocation (the network's country, region, city and time zone) comes
  // from a server function, so it is read in the Worker during SSR and client navigation alike.
  // Deferred: returned unawaited, so the page streams and the location group follows (DeferredPlace).
  loader: () => ({ info: localeInfo(getLocale()), place: getPlace() }),
  // The loader reads no search param (so no loaderDeps), and its data stays fresh for five
  // minutes: Back, Forward and the controls reuse it instead of calling the server function again.
  staleTime: 5 * 60_000,
  head: () => pageHead({ path: '/formats', title: locale => m.formats_title({}, { locale }), description: locale => m.formats_description({}, { locale }) }),
  component: Formats,
});

// The shared page, plus rows only this server-rendered app has: Cloudflare's view of the
// visitor (streamed) and further Intl examples.
function Formats() {
  const { info, place } = Route.useLoaderData();
  const locale = getLocale();
  const o = { locale };
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  return <FormatsPage locale={locale} info={info} preferred={usePreferred()} extras={{
    language: <Row sample="region" label={m.region_label({}, o)}>{regionName.of(samples.region)}</Row>,
    beforeSystems: <DeferredPlace locale={locale} place={place} />,
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
      <FormatsControls locale={locale} search={Route.useSearch()} />
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
