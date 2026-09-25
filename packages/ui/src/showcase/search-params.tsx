import { ClientOnly, Link, type SearchSchemaInput } from '@tanstack/react-router';
import { getLocale, type Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { localeInfo } from '../locale-info';
import { samples } from '../samples.js';
import { buttonVariants } from '../components/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Row } from '../pages';

// Typed, validated search params on the formats page: /formats?currency=JPY&count=11&calendar=islamic.
// The route wires `validateSearch` and strips `searchDefaults` from its URLs
// (`search: { middlewares: [stripSearchParams(searchDefaults)] }`), so the plain page stays
// /formats, an invalid value falls back to its default, and TanStack Router redirects (server)
// or replaces (browser) the URL with the normalised one. A plain function, no schema library.

/** The currencies the controls offer: zero, two and three minor-unit digits. */
export const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'KWD'] as const;
export type Currency = (typeof currencies)[number];
/** The counts the controls offer; any whole number from 0 to 1000 is valid in the URL. */
export const countChoices = [0, 1, 2, 3, 11, 100, 1000] as const;
export const maxCount = 1000;
/** Calendars offered in every language besides the language's own, so each has a choice. */
const showcaseCalendars = ['gregory', 'islamic', 'hebrew', 'japanese', 'buddhist', 'persian'];

export type FormatsSearch = { currency: Currency; count: number; calendar: string };
export const searchDefaults = { currency: 'EUR', count: 3, calendar: 'gregory' } as const satisfies FormatsSearch;

/** The language's own calendars (CLDR, where the runtime has them) first, then the showcase ones. */
export function calendarsFor(locale: Locale): string[] {
  const info = localeInfo(locale);
  return [...new Set([info.calendar, ...info.otherCalendars, ...showcaseCalendars])];
}

const isCurrency = (value: unknown): value is Currency => currencies.some(currency => currency === value);
function toCount(value: unknown): number | undefined {
  const count = typeof value === 'number' ? value : typeof value === 'string' && /^\d+$/.test(value) ? Number(value) : NaN;
  return Number.isInteger(count) && count >= 0 && count <= maxCount ? count : undefined;
}

/**
 * The formats route's `validateSearch`: every value is checked, and a missing or invalid one
 * becomes its default. The input type marks the params optional, so `<Link to="/formats">` needs
 * none, while a Link that sets one is type-checked against the allowed values.
 */
export function validateSearch(search: Partial<FormatsSearch> & SearchSchemaInput): FormatsSearch {
  const raw: Record<string, unknown> = search;
  return {
    currency: isCurrency(raw.currency) ? raw.currency : searchDefaults.currency,
    count: toCount(raw.count) ?? searchDefaults.count,
    calendar: typeof raw.calendar === 'string' && calendarsFor(getLocale()).includes(raw.calendar) ? raw.calendar : searchDefaults.calendar,
  };
}

const choice = buttonVariants({ size: 'sm', variant: 'outline' });
const chosen = buttonVariants({ size: 'sm' });

/** One control: a labelled list of links, each setting one search param and keeping the others. */
function Choices({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2" data-choices={name}>
    <p id={`choices-${name}`} className="text-sm text-muted-foreground">{label}</p>
    <ul aria-labelledby={`choices-${name}`} className="flex flex-wrap gap-2">{children}</ul>
  </div>;
}

/**
 * Controls for the formats page's search params, and the rows they change: an amount in the
 * chosen currency, a plural for the chosen count and a date in the chosen calendar. Every
 * control is a real, typed Link (shareable, works without JavaScript, preloads on intent); the
 * current choice is the exactly active one. Render it through FormatsPage's `after` extra with
 * `search={Route.useSearch()}`.
 */
export function FormatsControls({ locale, search, interactive = true }: { locale: Locale; search: FormatsSearch; interactive?: boolean }) {
  const o = { locale };
  const number = new Intl.NumberFormat(locale);
  const currencyName = new Intl.DisplayNames([locale], { type: 'currency' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const link = { from: '/formats', to: '/formats', resetScroll: false, activeOptions: { exact: true }, activeProps: { className: chosen }, inactiveProps: { className: choice } } as const;
  // Static stand-ins with the same look, for HTML rendered without a request (see PrerenderedFormatsControls).
  const still = (selected: boolean, text: React.ReactNode) => <span className={selected ? chosen : choice}>{text}</span>;
  return <Card data-showcase="search-params">
    <CardHeader><CardTitle>{m.choices_heading({}, o)}</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{m.choices_note({}, o)}</p>
      <Choices name="currency" label={m.currency_heading({}, o)}>
        {currencies.map(currency => <li key={currency}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, currency })} title={currencyName.of(currency)} data-currency-choice={currency}>{currency}</Link> : still(currency === search.currency, currency)}
        </li>)}
      </Choices>
      <Choices name="count" label={m.plural_heading({}, o)}>
        {countChoices.map(count => <li key={count}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, count })} data-count-choice={count}>{number.format(count)}</Link> : still(count === search.count, number.format(count))}
        </li>)}
      </Choices>
      <Choices name="calendar" label={m.calendar_label({}, o)}>
        {calendarsFor(locale).map(calendar => <li key={calendar}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, calendar })} data-calendar-choice={calendar}>{calendarName.of(calendar)}</Link> : still(calendar === search.calendar, calendarName.of(calendar))}
        </li>)}
      </Choices>
      <dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">
        <Row sample="chosen-currency" label={currencyName.of(search.currency) ?? search.currency} data-value={search.currency}>
          {new Intl.NumberFormat(locale, { style: 'currency', currency: search.currency }).format(samples.amount)}
        </Row>
        <Row sample="chosen-count" label={number.format(search.count)} data-value={search.count}>{m.apps_count({ count: search.count }, o)}</Row>
        <Row sample="chosen-calendar" label={calendarName.of(search.calendar) ?? search.calendar} data-value={search.calendar}>
          <time dateTime={samples.date.toISOString().slice(0, 10)}>{new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar: search.calendar, timeZone: 'UTC' }).format(samples.date)}</time>
        </Row>
      </dl>
    </CardContent>
  </Card>;
}

/**
 * FormatsControls for a prerendered page. Its HTML is built without a request, so it cannot know
 * the address's search params: the HTML shows the defaults as static labels, and the live controls
 * with the address's values replace them once hydrated, at the same size.
 */
export function PrerenderedFormatsControls({ locale, search }: { locale: Locale; search: FormatsSearch }) {
  return <ClientOnly fallback={<FormatsControls locale={locale} search={searchDefaults} interactive={false} />}>
    <FormatsControls locale={locale} search={search} />
  </ClientOnly>;
}
