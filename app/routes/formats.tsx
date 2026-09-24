import { locales, localeName, direction } from '@joeblew999/remy-ui/locale';
import { DeviceTime } from '@joeblew999/remy-ui/client';
import { placeFromCloudflare } from '@joeblew999/remy-ui/cloudflare';
import { localeInfo, weekdayName } from '@joeblew999/remy-ui/locale-info';
import { m } from '@joeblew999/remy-ui/messages';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import { pageMeta } from '../seo';
import { samples } from '@joeblew999/remy-ui/samples';
import { cloudflareContext } from '../context';
import type { Route } from './+types/formats';

export function loader({ params, context }: Route.LoaderArgs) {
  const locale = requireLocale(params.locale);
  // Cloudflare's request geolocation: the network's country, region, city and time zone.
  return { locale, info: localeInfo(locale), place: placeFromCloudflare(context.get(cloudflareContext).cf) };
}
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '/formats', locale => m.formats_title({}, { locale }), locale => m.formats_description({}, { locale }));
}

export default function Formats({ loaderData: { locale, info, place } }: Route.ComponentProps) {
  const o = { locale };
  const unknown = m.location_unknown({}, o);
  const regionName = new Intl.DisplayNames([locale], { type: 'region' });
  const localTime = (() => {
    try { return place.timeZone ? new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: place.timeZone }).format(samples.instant) : unknown; }
    catch { return unknown; }
  })();
  const placeText = [place.city, place.region].filter(Boolean).join(', ') || unknown;
  const dir = direction(locale);
  // Lists, collation, display names and ranges are native Intl; every other value is formatted inside its message.
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const available = list.format(locales.map(value => localeName(value)));
  const sorted = list.format([...samples.names].sort(new Intl.Collator(locale).compare));
  const region = new Intl.DisplayNames([locale], { type: 'region' }).of(samples.region);
  const currencyName = new Intl.DisplayNames([locale], { type: 'currency' }).of('EUR');
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const range = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd);
  const currencies = list.format(samples.currencies.map(currency => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(samples.amount)));
  const digits = new Intl.NumberFormat(locale, { numberingSystem: info.numberingSystem }).format(samples.decimal);
  const Row = ({ sample, label, children }: { sample: string; label: string; children: React.ReactNode }) =>
    <div><dt>{label}</dt><dd data-sample={sample}>{children}</dd></div>;
  return <Shell locale={locale} path="/formats">
    <section className="formats">
      <a className="back-link" href={`/${locale}`}><span aria-hidden="true" className="back-arrow" />{m.home_link({}, o)}</a>
      <p className="eyebrow">{m.formats_label({}, o)}</p>
      <h1>{m.formats_title({}, o)}</h1>
      <p className="intro">{m.formats_intro({}, o)}</p>

      <h2>{m.language_label({}, o)}</h2>
      <dl>
        <Row sample="tag" label={m.language_tag({}, o)}><code>{locale}</code></Row>
        <Row sample="name" label={m.language_name({}, o)}>{localeName(locale)}</Row>
        <div><dt>{m.direction_label({}, o)}</dt><dd data-sample="direction" data-direction={dir}>{dir === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o)}</dd></div>
        <Row sample="languages" label={m.languages_available({}, o)}>{available}</Row>
        <Row sample="region" label={m.region_label({}, o)}>{region}</Row>
      </dl>

      <h2>{m.systems_heading({}, o)}</h2>
      <dl>
        <Row sample="calendar" label={m.calendar_label({}, o)}>{calendarName.of(info.calendar)}</Row>
        <div><dt>{m.other_calendars_label({}, o)}</dt><dd data-sample="other-calendars">
          {info.otherCalendars.length === 0 ? m.no_other_calendars({}, o) : <ul className="calendars">
            {info.otherCalendars.map(calendar => <li key={calendar} data-calendar={calendar}>
              {calendarName.of(calendar)}: {new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar, timeZone: 'UTC' }).format(samples.date)}
            </li>)}
          </ul>}
        </dd></div>
        <Row sample="numbering" label={m.numbering_label({}, o)}><code>{info.numberingSystem}</code> · {digits}</Row>
        <Row sample="hour-cycle" label={m.hour_cycle_label({}, o)}>{['h11', 'h12'].includes(info.hourCycle) ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o)}</Row>
        {info.firstDay && <Row sample="week-start" label={m.week_start_label({}, o)}>{weekdayName(locale, info.firstDay)}</Row>}
        {info.weekend && <Row sample="weekend" label={m.weekend_label({}, o)}>{list.format(info.weekend.map(day => weekdayName(locale, day)))}</Row>}
      </dl>

      <h2>{m.dates_heading({}, o)}</h2>
      <dl>
        <Row sample="instant" label={m.instant_label({}, o)}><time dateTime={samples.instant.toISOString()}>{m.instant_value({ instant: samples.instant }, o)}</time></Row>
        <Row sample="date" label={m.plain_date_label({}, o)}><time dateTime={samples.date.toISOString().slice(0, 10)}>{m.plain_date_value({ date: samples.date }, o)}</time></Row>
        <Row sample="range" label={m.range_label({}, o)}>{range}</Row>
        <Row sample="relative" label={m.relative_label({}, o)}>{m.relative_value({ days: samples.days }, o)}</Row>
      </dl>

      <h2>{m.location_heading({}, o)}</h2>
      <dl>
        <div><dt>{m.your_country_label({}, o)}</dt><dd data-sample="country" data-country={place.country}>{place.country ? regionName.of(place.country) : unknown}</dd></div>
        <Row sample="place" label={m.place_label({}, o)}>{placeText}</Row>
        <div><dt>{m.cf_timezone_label({}, o)}</dt><dd data-sample="cf-timezone" data-timezone={place.timeZone}>{place.timeZone ?? unknown}</dd></div>
        <Row sample="cf-local" label={m.cf_local_time_label({}, o)}>{localTime}</Row>
      </dl>
      <p className="demo-note">{m.location_note({}, o)}</p>

      <h2>{m.timezone_heading({}, o)}</h2>
      <dl>
        <Row sample="local-row" label={m.local_time_label({}, o)}><DeviceTime locale={locale} instant={samples.instant} data-sample="local" /></Row>
      </dl>
      <p className="demo-note">{m.local_time_note({}, o)}</p>

      <h2>{m.numbers_heading({}, o)}</h2>
      <dl>
        <Row sample="decimal" label={m.decimal_label({}, o)}>{m.decimal_value({ value: samples.decimal }, o)}</Row>
        <Row sample="percent" label={m.percent_label({}, o)}>{m.percent_value({ value: samples.share }, o)}</Row>
        <Row sample="compact" label={m.compact_label({}, o)}>{m.compact_value({ value: samples.big }, o)}</Row>
      </dl>

      <h2>{m.units_heading({}, o)}</h2>
      <dl>
        <Row sample="distance" label={m.distance_label({}, o)}>{m.distance_value({ km: samples.km }, o)}</Row>
      </dl>

      <h2>{m.currency_heading({}, o)}</h2>
      <dl>
        <Row sample="currency" label={m.currency_label({}, o)}>{m.currency_value({ amount: samples.amount }, o)}</Row>
        <Row sample="currencies" label={m.currencies_label({}, o)}>{currencies}</Row>
        <Row sample="currency-name" label={m.currency_name_label({}, o)}>{currencyName}</Row>
      </dl>
      <p className="demo-note">{m.currency_note({}, o)}</p>

      <h2>{m.plural_heading({}, o)}</h2>
      <ul className="plurals">
        {samples.counts.map(count => <li key={count} data-count={count}>{m.apps_count({ count }, o)}</li>)}
      </ul>

      <h2>{m.ordinal_heading({}, o)}</h2>
      <ul className="plurals">
        {samples.positions.map(n => <li key={n} data-position={n}>{m.position_value({ n }, o)}</li>)}
      </ul>

      <h2>{m.variants_heading({}, o)}</h2>
      <dl>
        <Row sample="greeting" label={m.greeting_label({}, o)}>{m.greeting({ name: samples.guest }, o)}</Row>
        {samples.statuses.map(status => <Row key={status} sample={`status-${status}`} label={m.status_label({}, o)}>{m.invite_status({ status }, o)}</Row>)}
      </dl>

      <h2>{m.sorting_heading({}, o)}</h2>
      <dl>
        <Row sample="sorted" label={m.sorted_label({}, o)}>{sorted}</Row>
      </dl>
    </section>
  </Shell>;
}
