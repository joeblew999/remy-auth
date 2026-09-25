import { ClientOnly, Link } from '@tanstack/react-router';
import * as z from 'zod/mini';
import type { Locale } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { formatLocale, allChoices, choicesFor, choiceKinds, searchDefaults, maxCount, type ChoiceKind } from '../locale-info';
import { samples } from '../samples.js';
import { Badge } from '../components/badge';
import { buttonVariants } from '../components/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/card';
import { Row } from '../rows';

// Typed, validated search params on the formats page: /formats?currency=JPY&count=11&calendar=islamic&numbering=arabext.
// The route wires `validateSearch` to a Zod 4 schema, which TanStack Router takes directly as a
// Standard Schema (no adapter), and strips `searchDefaults` from its URLs
// (`search: { middlewares: [stripSearchParams(searchDefaults)] }`), so the plain page stays
// /formats, an invalid value falls back to its default (Zod's catch), and TanStack Router
// redirects (server) or replaces (browser) the URL with the normalised one. The schema uses Zod
// Mini, Zod's own tree-shakable build of the same schemas: the route's validateSearch is in every
// page's entry chunk, and Mini adds about a quarter of what classic Zod does to it.
//
// Nothing here is a list: every choice and default is derived in ../locale-data.js (re-exported by
// ../locale-info). Each control offers the union over Paraglide's locales of each language's own
// values, the page's language's first; adding a language adds its calendar, digits, currency and
// plural forms here with no edit.
export { searchDefaults, maxCount, type ChoiceKind };

const { currency, count, calendar, numbering } = searchDefaults;
/** One of a control's derived values, else its default. */
const oneOf = (kind: 'currency' | 'calendar' | 'numbering', fallback: string) =>
  z.catch(z._default(z.enum(allChoices(kind) as [string, ...string[]]), fallback), fallback);

/**
 * The formats route's `validateSearch` schema: every value is checked, and a missing or invalid one
 * becomes its default. The schema's input marks the params optional, so `<Link to="/formats">`
 * needs none. The count accepts any whole number from 0 to maxCount, also as digits in text, as
 * the router parses `?count=0011`.
 */
export const formatsSearchSchema = z.object({
  currency: oneOf('currency', currency),
  count: z.catch(z._default(z.pipe(
    z.union([z.number(), z.pipe(z.string().check(z.regex(/^\d+$/)), z.transform(Number))]),
    z.number().check(z.int(), z.minimum(0), z.maximum(maxCount)),
  ), count), count),
  calendar: oneOf('calendar', calendar),
  numbering: oneOf('numbering', numbering),
});
export type FormatsSearch = z.output<typeof formatsSearchSchema>;

const choice = buttonVariants({ size: 'sm', variant: 'outline' });
const own = buttonVariants({ size: 'sm', variant: 'secondary' });
const chosen = buttonVariants({ size: 'sm' });

/**
 * One control: a labelled list of links, each setting one search param and keeping the others. The
 * page's language's own values come first, in the secondary look and described by the "This
 * language" badge under the list; then every other language's.
 */
function Choices<T extends string | number>({ label, name, locale, render }: {
  label: string; name: ChoiceKind; locale: Locale; render: (value: T, className: string) => React.ReactNode;
}) {
  const { own: ownValues, others } = choicesFor(locale, name) as { own: T[]; others: T[] };
  const ownId = `choices-${name}-own`;
  return <div className="flex flex-col gap-2" data-choices={name}>
    <p id={`choices-${name}`} className="text-sm text-muted-foreground">{label}</p>
    <ul aria-labelledby={`choices-${name}`} className="flex flex-wrap gap-2">
      {ownValues.map(value => <li key={value} data-choice-value={value} data-own>{render(value, own)}</li>)}
      {others.map(value => <li key={value} data-choice-value={value}>{render(value, choice)}</li>)}
    </ul>
    <p><Badge id={ownId} variant="secondary">{m.section_language({}, { locale })}</Badge></p>
  </div>;
}

type ChoiceProps = { locale: Locale; search: FormatsSearch; interactive?: boolean; to?: '/formats' | '/app/formats' };

/**
 * One control for the formats page's search params, beside the row it changes: the calendar (a
 * date in it), the numbering system (a number in its digits), the currency (an amount in it) or the
 * count (a plural). Every choice is a real, typed Link (shareable, works without JavaScript,
 * preloads on intent); the current choice is the exactly active one. `to` is the page it sits on,
 * the site's /formats or the app's /app/formats.
 */
export function ChoiceCard({ kind, locale, search, interactive = true, to = '/formats' }: ChoiceProps & { kind: ChoiceKind }) {
  const o = { locale };
  const format = formatLocale(locale);
  const number = new Intl.NumberFormat(format);
  const inDigits = (numberingSystem: string, value: number) => new Intl.NumberFormat(format, { numberingSystem }).format(value);
  const currencyName = new Intl.DisplayNames([locale], { type: 'currency' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  const describedBy = (className: string) => className === own ? `choices-${kind}-own` : undefined;
  const link = (className: string) => ({
    from: to, to, resetScroll: false, activeOptions: { exact: true },
    activeProps: { className: chosen }, inactiveProps: { className }, 'aria-describedby': describedBy(className),
  }) as const;
  // Static stand-ins with the same look, for HTML rendered without a request (see prerenderedChoiceCards).
  const still = (selected: boolean, className: string, text: React.ReactNode) =>
    <span className={selected ? chosen : className} aria-describedby={describedBy(className)}>{text}</span>;
  const rows = 'grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm';
  const body = {
    calendar: <>
      <Choices<string> name="calendar" locale={locale} label={m.calendar_label({}, o)} render={(calendar, className) => interactive
        ? <Link {...link(className)} search={prev => ({ ...prev, calendar })} data-calendar-choice={calendar}>{calendarName.of(calendar)}</Link>
        : still(calendar === search.calendar, className, calendarName.of(calendar))} />
      <dl className={rows}><Row sample="chosen-calendar" label={calendarName.of(search.calendar) ?? search.calendar} data-value={search.calendar}>
        <time dateTime={samples.date.toISOString().slice(0, 10)}>{new Intl.DateTimeFormat(format, { ...samples.calendarDate, calendar: search.calendar }).format(samples.date)}</time>
      </Row></dl>
    </>,
    // Intl has no display name for a numbering system: each choice is its CLDR code and a number in its digits.
    numbering: <>
      <Choices<string> name="numbering" locale={locale} label={m.numbering_label({}, o)} render={(numbering, className) => {
        const text = `${numbering} · ${inDigits(numbering, samples.days)}`;
        return interactive
          ? <Link {...link(className)} search={prev => ({ ...prev, numbering })} data-numbering-choice={numbering}>{text}</Link>
          : still(numbering === search.numbering, className, text);
      }} />
      <dl className={rows}><Row sample="chosen-numbering" label={search.numbering} data-value={search.numbering}>{inDigits(search.numbering, samples.decimal)}</Row></dl>
    </>,
    currency: <>
      <Choices<string> name="currency" locale={locale} label={m.currency_heading({}, o)} render={(currency, className) => interactive
        ? <Link {...link(className)} search={prev => ({ ...prev, currency })} title={currencyName.of(currency)} data-currency-choice={currency}>{currency}</Link>
        : still(currency === search.currency, className, currency)} />
      <dl className={rows}><Row sample="chosen-currency" label={currencyName.of(search.currency) ?? search.currency} data-value={search.currency}>
        {new Intl.NumberFormat(format, { style: 'currency', currency: search.currency }).format(samples.amount)}
      </Row></dl>
    </>,
    count: <>
      <Choices<number> name="count" locale={locale} label={m.plural_heading({}, o)} render={(count, className) => interactive
        ? <Link {...link(className)} search={prev => ({ ...prev, count })} data-count-choice={count}>{number.format(count)}</Link>
        : still(count === search.count, className, number.format(count))} />
      <dl className={rows}><Row sample="chosen-count" label={number.format(search.count)} data-value={search.count}>{m.apps_count({ count: search.count }, o)}</Row></dl>
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

/** The controls, one per kind, for FormatsContent's `controls`: each is placed in the section it changes. */
export function choiceCards(props: ChoiceProps): Record<ChoiceKind, React.ReactNode> {
  return Object.fromEntries(choiceKinds.map(kind => [kind, <ChoiceCard kind={kind} {...props} />])) as Record<ChoiceKind, React.ReactNode>;
}

/**
 * The controls for a prerendered page. Its HTML is built without a request, so it cannot know the
 * address's search params: the HTML shows the defaults as static labels, and the live controls with
 * the address's values replace them once hydrated, at the same size.
 */
export function prerenderedChoiceCards({ search, ...props }: ChoiceProps): Record<ChoiceKind, React.ReactNode> {
  return Object.fromEntries(choiceKinds.map(kind => [kind,
    <ClientOnly fallback={<ChoiceCard kind={kind} {...props} search={searchDefaults} interactive={false} />}>
      <ChoiceCard kind={kind} {...props} search={search} />
    </ClientOnly>])) as Record<ChoiceKind, React.ReactNode>;
}
