import type { Locale } from '@joeblew999/remy-ui/locale';
import { formatLocale, type LocaleInfo } from '@joeblew999/remy-ui/locale-info';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { Group, Row, type FormatsExtras } from '@joeblew999/remy-ui/pages';
import type { Place } from '@joeblew999/remy-ui/cloudflare';
import { DeferredPlace } from './showcase/deferred-place';

/**
 * The rows this server-rendered app adds to the shared formats content, on the site page and the
 * app page alike: Cloudflare's view of the visitor (streamed) and further Intl examples.
 */
export function formatsExtras({ locale, info, place }: { locale: Locale; info: LocaleInfo; place: Promise<Place> }): FormatsExtras {
  const o = { locale };
  const format = formatLocale(locale);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  return {
    language: <Row sample="region" label={m.region_label({}, o)}>{regionName.of(info.region)}</Row>,
    time: <DeferredPlace locale={locale} place={place} />,
    systems: <>
      <Row sample="other-calendars" label={m.other_calendars_label({}, o)}>
        {info.otherCalendars.length === 0 ? m.no_other_calendars({}, o) : <ul className="flex flex-col gap-1">
          {info.otherCalendars.map(calendar => <li key={calendar} data-calendar={calendar}>
            {calendarName.of(calendar)}: {new Intl.DateTimeFormat(format, { ...samples.calendarDate, calendar }).format(samples.date)}
          </li>)}
        </ul>}
      </Row>
    </>,
    dates: <Row sample="range" label={m.range_label({}, o)}>{new Intl.DateTimeFormat(format, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd)}</Row>,
    currency: <>
      <Row sample="currencies" label={m.currencies_label({}, o)}>{list.format(samples.currencies.map(currency => new Intl.NumberFormat(format, { style: 'currency', currency }).format(samples.amount)))}</Row>
      <Row sample="currency-name" label={m.currency_name_label({}, o)}>{new Intl.DisplayNames([locale], { type: 'currency' }).of(info.currency)}</Row>
    </>,
    money: <p className="text-sm leading-relaxed text-muted-foreground md:col-span-2">{m.currency_note({}, o)}</p>,
    numbers: <Group title={m.units_heading({}, o)}>
      <Row sample="distance" label={m.distance_label({}, o)}>{m.distance_value({ km: samples.km }, o)}</Row>
    </Group>,
    words: <>
      <Group title={m.variants_heading({}, o)}>
        <Row sample="greeting" label={m.greeting_label({}, o)}>{m.greeting({ name: samples.guest }, o)}</Row>
        {samples.statuses.map(status => <Row key={status} sample={`status-${status}`} label={m.status_label({}, o)}>{m.invite_status({ status }, o)}</Row>)}
      </Group>
      <Group title={m.sorting_heading({}, o)}>
        <Row sample="sorted" label={m.sorted_label({}, o)}>{list.format([...samples.names].sort(new Intl.Collator(locale).compare))}</Row>
      </Group>
    </>,
  };
}
