import { ArrowLeftIcon } from 'lucide-react';
import { locales, localeName, direction } from '@joeblew999/remy-ui/locale';
import { placeFromCloudflare } from '@joeblew999/remy-ui/cloudflare';
import { cloudflareContext } from '../context';
import { localeInfo, weekdayName } from '@joeblew999/remy-ui/locale-info';
import { DeviceTime } from '@joeblew999/remy-ui/client';
import { Badge } from '@joeblew999/remy-ui/components/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@joeblew999/remy-ui/components/card';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import { pageMeta } from '../seo';
import type { Route } from './+types/formats';

export function loader({ params, context }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  // Cloudflare's request geolocation: the network's country, region, city and time zone.
  return { locale, info: localeInfo(locale), place: placeFromCloudflare(context.get(cloudflareContext).cf) };
}
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '/formats', locale => m.formats_title({}, { locale }), locale => m.formats_description({}, { locale }));
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">{children}</dl></CardContent></Card>;
}
function Row({ sample, label, children, ...rest }: { sample: string; label: string; children: React.ReactNode } & Record<string, unknown>) {
  return <><dt className="text-muted-foreground">{label}</dt><dd data-sample={sample} className="tabular-nums [overflow-wrap:anywhere]" {...rest}>{children}</dd></>;
}

export default function Formats({ loaderData: { locale, info, place } }: Route.ComponentProps) {
  const o = { locale };
  const dir = direction(locale);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  const unknown = m.location_unknown({}, o);
  const localTime = (() => {
    try { return place.timeZone ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: place.timeZone }).format(samples.instant) : unknown; }
    catch { return unknown; }
  })();
  const placeText = [place.city, place.region].filter(Boolean).join(', ') || unknown;
  return <Shell locale={locale} path="/formats">
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <a className="inline-flex items-center gap-1 text-sm text-muted-foreground" href={`/${locale}`}><ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />{m.home_link({}, o)}</a>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.formats_label({}, o)}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{m.formats_title({}, o)}</h1>
      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{m.formats_intro({}, o)}</p>

      <Group title={m.language_label({}, o)}>
        <Row sample="tag" label={m.language_tag({}, o)}><code>{locale}</code></Row>
        <Row sample="name" label={m.language_name({}, o)}>{localeName(locale)}</Row>
        <Row sample="direction" label={m.direction_label({}, o)} data-direction={dir}>{dir === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o)}</Row>
        <Row sample="languages" label={m.languages_available({}, o)}>{list.format(locales.map(value => localeName(value)))}</Row>
        <Row sample="region" label={m.region_label({}, o)}>{regionName.of(samples.region)}</Row>
      </Group>

      <Group title={m.location_heading({}, o)}>
        <Row sample="country" label={m.your_country_label({}, o)} data-country={place.country}>{place.country ? regionName.of(place.country) : unknown}</Row>
        <Row sample="place" label={m.place_label({}, o)}>{placeText}</Row>
        <Row sample="cf-timezone" label={m.cf_timezone_label({}, o)} data-timezone={place.timeZone}>{place.timeZone ?? unknown}</Row>
        <Row sample="cf-local" label={m.cf_local_time_label({}, o)}>{localTime}</Row>
      </Group>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.location_note({}, o)}</p>

      <Group title={m.systems_heading({}, o)}>
        <Row sample="calendar" label={m.calendar_label({}, o)}>{calendarName.of(info.calendar)}</Row>
        <Row sample="numbering" label={m.numbering_label({}, o)}><code>{info.numberingSystem}</code> · {new Intl.NumberFormat(locale, { numberingSystem: info.numberingSystem }).format(samples.decimal)}</Row>
        <Row sample="hour-cycle" label={m.hour_cycle_label({}, o)}>{['h11', 'h12'].includes(info.hourCycle) ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o)}</Row>
        {info.firstDay && <Row sample="week-start" label={m.week_start_label({}, o)}>{weekdayName(locale, info.firstDay)}</Row>}
        {info.weekend && <Row sample="weekend" label={m.weekend_label({}, o)}>{list.format(info.weekend.map(day => weekdayName(locale, day)))}</Row>}
        <Row sample="other-calendars" label={m.other_calendars_label({}, o)}>
          {info.otherCalendars.length === 0 ? m.no_other_calendars({}, o) : <ul className="flex flex-col gap-1">
            {info.otherCalendars.map(calendar => <li key={calendar} data-calendar={calendar}>
              {calendarName.of(calendar)}: {new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar, timeZone: 'UTC' }).format(samples.date)}
            </li>)}
          </ul>}
        </Row>
      </Group>

      <Group title={m.dates_heading({}, o)}>
        <Row sample="instant" label={m.instant_label({}, o)}><time dateTime={samples.instant.toISOString()}>{m.instant_value({ instant: samples.instant }, o)}</time></Row>
        <Row sample="date" label={m.plain_date_label({}, o)}><time dateTime={samples.date.toISOString().slice(0, 10)}>{m.plain_date_value({ date: samples.date }, o)}</time></Row>
        <Row sample="range" label={m.range_label({}, o)}>{new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd)}</Row>
        <Row sample="relative" label={m.relative_label({}, o)}>{m.relative_value({ days: samples.days }, o)}</Row>
        <Row sample="local-row" label={m.local_time_label({}, o)}><DeviceTime locale={locale} instant={samples.instant} data-sample="local" /></Row>
      </Group>

      <Group title={m.numbers_heading({}, o)}>
        <Row sample="decimal" label={m.decimal_label({}, o)}>{m.decimal_value({ value: samples.decimal }, o)}</Row>
        <Row sample="percent" label={m.percent_label({}, o)}>{m.percent_value({ value: samples.share }, o)}</Row>
        <Row sample="compact" label={m.compact_label({}, o)}>{m.compact_value({ value: samples.big }, o)}</Row>
      </Group>

      <Group title={m.units_heading({}, o)}>
        <Row sample="distance" label={m.distance_label({}, o)}>{m.distance_value({ km: samples.km }, o)}</Row>
      </Group>

      <Group title={m.currency_heading({}, o)}>
        <Row sample="currency" label={m.currency_label({}, o)}>{m.currency_value({ amount: samples.amount }, o)}</Row>
        <Row sample="currencies" label={m.currencies_label({}, o)}>{list.format(samples.currencies.map(currency => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(samples.amount)))}</Row>
        <Row sample="currency-name" label={m.currency_name_label({}, o)}>{new Intl.DisplayNames([locale], { type: 'currency' }).of('EUR')}</Row>
      </Group>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.currency_note({}, o)}</p>

      <Card><CardHeader><CardTitle>{m.plural_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.counts.map(count => <li key={count}><Badge variant="outline" data-count={count}>{m.apps_count({ count }, o)}</Badge></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>{m.ordinal_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.positions.map(n => <li key={n}><Badge variant="outline" data-position={n}>{m.position_value({ n }, o)}</Badge></li>)}</ul></CardContent></Card>

      <Group title={m.variants_heading({}, o)}>
        <Row sample="greeting" label={m.greeting_label({}, o)}>{m.greeting({ name: samples.guest }, o)}</Row>
        {samples.statuses.map(status => <Row key={status} sample={`status-${status}`} label={m.status_label({}, o)}>{m.invite_status({ status }, o)}</Row>)}
      </Group>

      <Group title={m.sorting_heading({}, o)}>
        <Row sample="sorted" label={m.sorted_label({}, o)}>{list.format([...samples.names].sort(new Intl.Collator(locale).compare))}</Row>
      </Group>
    </section>
  </Shell>;
}
