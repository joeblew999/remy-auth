import { ClientOnly, Link } from '@tanstack/react-router';
import * as z from 'zod/mini';
import { getLocale, type Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { formatLocale, localeInfo } from '../locale-info';
import { samples } from '../samples.js';
import { buttonVariants } from '../components/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Row } from '../pages';

// Typed, validated search params on the formats page: /formats?currency=JPY&count=11&calendar=islamic.
// The route wires `validateSearch` to a Zod 4 schema, which TanStack Router takes directly as a
// Standard Schema (no adapter), and strips `searchDefaults` from its URLs
// (`search: { middlewares: [stripSearchParams(searchDefaults)] }`), so the plain page stays
// /formats, an invalid value falls back to its default (Zod's catch), and TanStack Router
// redirects (server) or replaces (browser) the URL with the normalised one. The schema uses Zod
// Mini, Zod's own tree-shakable build of the same schemas: the route's validateSearch is in every
// page's entry chunk, and Mini adds about a quarter of what classic Zod does to it.

/** The currencies the controls offer: zero, two and three minor-unit digits. */
export const currencies = ['EUR', 'USD', 'GBP', 'JPY', 'KWD'] as const;
export type Currency = (typeof currencies)[number];
/** The counts the controls offer; any whole number from 0 to 1000 is valid in the URL. */
export const countChoices = [0, 1, 2, 3, 11, 100, 1000] as const;
export const maxCount = 1000;
/**
 * Calendars offered in every language besides the language's own, so each has a choice: the era
 * calendars (Japanese, Republic of China), the solar and lunar ones (Persian, Buddhist, Hebrew,
 * Islamic, Ethiopian) and the Chinese lunisolar calendar.
 */
const showcaseCalendars = ['gregory', 'islamic', 'hebrew', 'japanese', 'roc', 'buddhist', 'persian', 'ethiopic', 'chinese'];

export const searchDefaults = { currency: 'EUR', count: 3, calendar: 'gregory' } as const;

/** The language's own calendars (CLDR, where the runtime has them) first, then the showcase ones. */
export function calendarsFor(locale: Locale): string[] {
  const info = localeInfo(locale);
  return [...new Set([info.calendar, ...info.otherCalendars, ...showcaseCalendars])];
}

const { currency, count, calendar } = searchDefaults;

/**
 * The formats route's `validateSearch` schema: every value is checked, and a missing or invalid one
 * becomes its default. The schema's input marks the params optional, so `<Link to="/formats">`
 * needs none, while a Link that sets one is type-checked against the allowed values. The count
 * also accepts the digits as text, as the router parses `?count=0011`.
 */
export const formatsSearchSchema = z.object({
  currency: z.catch(z._default(z.enum(currencies), currency), currency),
  count: z.catch(z._default(z.pipe(
    z.union([z.number(), z.pipe(z.string().check(z.regex(/^\d+$/)), z.transform(Number))]),
    z.number().check(z.int(), z.minimum(0), z.maximum(maxCount)),
  ), count), count),
  calendar: z.catch(z._default(z.string().check(z.refine(value => calendarsFor(getLocale()).includes(value))), calendar), calendar),
});
export type FormatsSearch = z.output<typeof formatsSearchSchema>;

const choice = buttonVariants({ size: 'sm', variant: 'outline' });
const chosen = buttonVariants({ size: 'sm' });

/** One control: a labelled list of links, each setting one search param and keeping the others. */
function Choices({ label, name, children }: { label: string; name: string; children: React.ReactNode }) {
  return <div className="flex flex-col gap-2" data-choices={name}>
    <p id={`choices-${name}`} className="text-sm text-muted-foreground">{label}</p>
    <ul aria-labelledby={`choices-${name}`} className="flex flex-wrap gap-2">{children}</ul>
  </div>;
}

/** Which search param a control sets. */
export type ChoiceKind = 'currency' | 'count' | 'calendar';
type ChoiceProps = { locale: Locale; search: FormatsSearch; interactive?: boolean; to?: '/formats' | '/app/formats' };

/**
 * One control for the formats page's search params, beside the row it changes: the currency (an
 * amount in it), the count (a plural) or the calendar (a date in it). Every choice is a real, typed
 * Link (shareable, works without JavaScript, preloads on intent); the current choice is the exactly
 * active one. `to` is the page it sits on, the site's /formats or the app's /app/formats.
 */
export function ChoiceCard({ kind, locale, search, interactive = true, to = '/formats' }: ChoiceProps & { kind: ChoiceKind }) {
  const o = { locale };
  const format = formatLocale(locale);
  const number = new Intl.NumberFormat(format);
  const currencyName = new Intl.DisplayNames([locale], { type: 'currency' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const link = { from: to, to, resetScroll: false, activeOptions: { exact: true }, activeProps: { className: chosen }, inactiveProps: { className: choice } } as const;
  // Static stand-ins with the same look, for HTML rendered without a request (see prerenderedChoiceCards).
  const still = (selected: boolean, text: React.ReactNode) => <span className={selected ? chosen : choice}>{text}</span>;
  const rows = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm';
  const body = {
    currency: <>
      <Choices name="currency" label={m.currency_heading({}, o)}>
        {currencies.map(currency => <li key={currency}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, currency })} title={currencyName.of(currency)} data-currency-choice={currency}>{currency}</Link> : still(currency === search.currency, currency)}
        </li>)}
      </Choices>
      <dl className={rows}><Row sample="chosen-currency" label={currencyName.of(search.currency) ?? search.currency} data-value={search.currency}>
        {new Intl.NumberFormat(format, { style: 'currency', currency: search.currency }).format(samples.amount)}
      </Row></dl>
    </>,
    count: <>
      <Choices name="count" label={m.plural_heading({}, o)}>
        {countChoices.map(count => <li key={count}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, count })} data-count-choice={count}>{number.format(count)}</Link> : still(count === search.count, number.format(count))}
        </li>)}
      </Choices>
      <dl className={rows}><Row sample="chosen-count" label={number.format(search.count)} data-value={search.count}>{m.apps_count({ count: search.count }, o)}</Row></dl>
    </>,
    calendar: <>
      <Choices name="calendar" label={m.calendar_label({}, o)}>
        {calendarsFor(locale).map(calendar => <li key={calendar}>
          {interactive ? <Link {...link} search={prev => ({ ...prev, calendar })} data-calendar-choice={calendar}>{calendarName.of(calendar)}</Link> : still(calendar === search.calendar, calendarName.of(calendar))}
        </li>)}
      </Choices>
      <dl className={rows}><Row sample="chosen-calendar" label={calendarName.of(search.calendar) ?? search.calendar} data-value={search.calendar}>
        <time dateTime={samples.date.toISOString().slice(0, 10)}>{new Intl.DateTimeFormat(format, { ...samples.calendarDate, calendar: search.calendar }).format(samples.date)}</time>
      </Row></dl>
    </>,
  }[kind];
  return <Card data-showcase="search-params" data-choice={kind}>
    <CardHeader><CardTitle>{m.choices_heading({}, o)}</CardTitle></CardHeader>
    <CardContent className="flex flex-col gap-5">
      <p className="text-sm leading-relaxed text-muted-foreground">{m.choices_note({}, o)}</p>
      {body}
    </CardContent>
  </Card>;
}

/** The three controls, for FormatsContent's `controls`: each is placed in the section it changes. */
export function choiceCards(props: ChoiceProps) {
  return { currency: <ChoiceCard kind="currency" {...props} />, count: <ChoiceCard kind="count" {...props} />, calendar: <ChoiceCard kind="calendar" {...props} /> };
}

/**
 * The controls for a prerendered page. Its HTML is built without a request, so it cannot know the
 * address's search params: the HTML shows the defaults as static labels, and the live controls with
 * the address's values replace them once hydrated, at the same size.
 */
export function prerenderedChoiceCards({ search, ...props }: ChoiceProps) {
  const card = (kind: ChoiceKind) => <ClientOnly fallback={<ChoiceCard kind={kind} {...props} search={searchDefaults} interactive={false} />}>
    <ChoiceCard kind={kind} {...props} search={search} />
  </ClientOnly>;
  return { currency: card('currency'), count: card('count'), calendar: card('calendar') };
}
