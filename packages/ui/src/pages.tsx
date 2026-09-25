import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import { locales, getTextDirection as direction, type Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { localeName } from './locale';
import { weekdayName, type LocaleInfo } from './locale-info';
import { DeviceTime } from './client';
import { LanguageHint } from './language';
import { samples } from './samples.js';
import { Badge } from './components/badge';
import { Button, buttonVariants } from './components/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from './components/field';
import { Input } from './components/input';
import { SidebarInset, SidebarProvider } from './components/sidebar';
import { AppSidebar } from './blocks/sidebar-16/app-sidebar';
import { SiteHeader } from './blocks/sidebar-16/site-header';

// The pages every Remy app built on this package shows, and that the shared checks test.
// Apps keep their route modules (loaders, head, runtime wiring) and render these.
// In-app links are TanStack Links to de-localized paths: the router's rewrite (localeRewrite in
// ./tanstack) adds the page's locale, and they preload on intent. Language changes stay full
// navigations through the plain anchors of LanguageSwitcher and LanguageHint.

export { publicPaths } from './paths.js';

/**
 * Page frame: shadcn's sidebar-16 block (blocks/sidebar-16): a sticky site header with the sidebar
 * toggle, brand and language switcher; the sidebar with the pages; then the page. `preferred` is the
 * language to offer, however the app learns it.
 */
export function Shell({ locale, path = '', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  return <div className="[--header-height:calc(--spacing(14))]">
    <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-60 focus:bg-background focus:p-3" href="#main">{m.skip_link({}, { locale })}</a>
    <SidebarProvider className="flex flex-col">
      <SiteHeader locale={locale} path={path} />
      <div className="flex flex-1">
        <AppSidebar locale={locale} />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <LanguageHint locale={locale} path={path} preferred={preferred} />
            <main id="main" className="mx-auto w-full max-w-3xl flex-1">{children}</main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  </div>;
}

function Intro({ locale, label, title, intro, back = true }: { locale: Locale; label: string; title: string; intro: string; back?: boolean }) {
  return <>
    {back && <Link className="inline-flex items-center gap-1 text-sm text-muted-foreground" to="/" preload="intent"><ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />{m.home_link({}, { locale })}</Link>}
    <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>
    <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
    <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{intro}</p>
  </>;
}

/** The home page; `children` go inside the page under its links, for example an app's live status. */
export function HomePage({ locale, preferred, children }: { locale: Locale; preferred?: Locale; children?: React.ReactNode }) {
  const o = { locale };
  return <Shell locale={locale} preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} back={false} label={m.public_label({}, o)} title={m.home_title({}, o)} intro={m.home_intro({}, o)} />
      <div className="flex flex-wrap gap-3">
        <Link className={buttonVariants({ size: 'lg' })} to="/demo" preload="intent">{m.demo_link({}, o)}</Link>
        <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} to="/formats" preload="intent">{m.formats_link({}, o)}</Link>
      </div>
      {children}
    </section>
  </Shell>;
}

/** The demo form's starting number of seats. */
const defaultGuests = 2;

/** A reservation the demo form accepted on its own checks. */
export type Reservation = { name: string; guests: number };
/** The answer to a reservation: field errors to show like the form's own, or the confirmation to show instead of the default one. */
export type ReservationResult = { errors?: { name?: string; guests?: string }; message?: string };

export function DemoPage({ locale, preferred, onReserve, onDirtyChange }: {
  locale: Locale; preferred?: Locale;
  /** Called once the form's own validation passes, for example a server function that validates again. Without it the form confirms locally. */
  onReserve?: (reservation: Reservation) => ReservationResult | Promise<ReservationResult>;
  /** Told whenever the form holds input that has not been reserved yet, for example to warn before leaving. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const o = { locale };
  const [count, setCount] = useState(0);
  const [errors, setErrors] = useState<{ name?: string; guests?: string }>({});
  const [reservation, setReservation] = useState<{ name: string; count: number; message?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  // Input typed before hydration (a prerendered page) fired no onInput, so check once hydrated.
  useEffect(() => {
    const data = form.current && new FormData(form.current);
    if (data && (String(data.get('name') ?? '').trim() || Number(data.get('guests')) !== defaultGuests)) onDirtyChange?.(true);
  }, []);
  function settle(next: typeof errors, accepted: { name: string; count: number; message?: string }) {
    const ok = Object.keys(next).length === 0;
    setFailed(false);
    setErrors(next);
    setReservation(ok ? accepted : null);
    if (ok) onDirtyChange?.(false);
  }
  function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const guests = Number(data.get('guests'));
    const next: typeof errors = {};
    if (!name) next.name = m.name_required({}, o);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) next.guests = m.guests_invalid({}, o);
    if (Object.keys(next).length || !onReserve) return settle(next, { name, count: guests });
    void Promise.resolve().then(() => onReserve({ name, guests })).then(
      result => settle(result.errors ?? {}, { name, count: guests, message: result.message }),
      () => { setReservation(null); setFailed(true); });
  }
  return <Shell locale={locale} path="/demo" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} label={m.demo_label({}, o)} title={m.demo_title({}, o)} intro={m.demo_description({}, o)} />
      <Card>
        <CardHeader><CardTitle>{m.count_label({}, o)}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <output aria-live="polite" className="block text-6xl tabular-nums">{new Intl.NumberFormat(locale).format(count)}</output>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setCount(value => value + 1)}>{m.increment({}, o)}</Button>
            <Button variant="outline" onClick={() => setCount(0)} disabled={count === 0}>{m.reset({}, o)}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{m.form_heading({}, o)}</CardTitle></CardHeader>
        <CardContent>
          <form ref={form} noValidate onSubmit={reserve} onInput={() => onDirtyChange?.(true)} className="flex flex-col gap-6">
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">{m.name_label({}, o)}</FieldLabel>
                <Input id="name" name="name" dir="auto" autoComplete="name" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'name-error' : undefined} />
                {errors.name && <FieldError id="name-error">{errors.name}</FieldError>}
              </Field>
              <Field data-invalid={errors.guests ? true : undefined}>
                <FieldLabel htmlFor="guests">{m.guests_label({}, o)}</FieldLabel>
                <Input id="guests" name="guests" type="number" inputMode="numeric" min={1} max={20} step={1} defaultValue={defaultGuests} aria-invalid={errors.guests ? true : undefined} aria-describedby={errors.guests ? 'guests-error' : undefined} />
                {errors.guests && <FieldError id="guests-error">{errors.guests}</FieldError>}
              </Field>
            </FieldGroup>
            <div><Button type="submit">{m.submit({}, o)}</Button></div>
            <p role="status" className="reserved min-h-6">{failed ? m.error_detail({}, o) : reservation && (reservation.message ?? m.reserved({ name: reservation.name, count: reservation.count }, o))}</p>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.demo_note({}, o)}</p>
    </section>
  </Shell>;
}

/** A titled card of label/value rows on the formats page. */
export function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return <Card><CardHeader><CardTitle>{title}</CardTitle></CardHeader>
    <CardContent><dl className="grid grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] gap-x-4 gap-y-3 text-sm">{children}</dl></CardContent></Card>;
}
/** One row; `sample` becomes data-sample, which the shared checks read. */
export function Row({ sample, label, children, ...rest }: { sample: string; label: string; children: React.ReactNode } & Record<string, unknown>) {
  return <><dt className="text-muted-foreground">{label}</dt><dd data-sample={sample} className="tabular-nums [overflow-wrap:anywhere]" {...rest}>{children}</dd></>;
}

/** Extra rows an app adds inside the shared groups, and extra sections before and after them. */
export type FormatsExtras = { language?: React.ReactNode; systems?: React.ReactNode; dates?: React.ReactNode; currency?: React.ReactNode; beforeSystems?: React.ReactNode; after?: React.ReactNode };

export function FormatsPage({ locale, info, preferred, extras = {} }: { locale: Locale; info: LocaleInfo; preferred?: Locale; extras?: FormatsExtras }) {
  const o = { locale };
  const dir = direction(locale);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const calendarName = new Intl.DisplayNames([locale], { type: 'calendar' });
  return <Shell locale={locale} path="/formats" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} label={m.formats_label({}, o)} title={m.formats_title({}, o)} intro={m.formats_intro({}, o)} />
      <Group title={m.language_label({}, o)}>
        <Row sample="tag" label={m.language_tag({}, o)}><code>{locale}</code></Row>
        <Row sample="name" label={m.language_name({}, o)}>{localeName(locale)}</Row>
        <Row sample="direction" label={m.direction_label({}, o)} data-direction={dir}>{dir === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o)}</Row>
        <Row sample="languages" label={m.languages_available({}, o)}>{list.format(locales.map(value => localeName(value)))}</Row>
        {extras.language}
      </Group>
      {extras.beforeSystems}
      <Group title={m.systems_heading({}, o)}>
        <Row sample="calendar" label={m.calendar_label({}, o)}>{calendarName.of(info.calendar)}</Row>
        <Row sample="numbering" label={m.numbering_label({}, o)}><code>{info.numberingSystem}</code> · {new Intl.NumberFormat(locale, { numberingSystem: info.numberingSystem }).format(samples.decimal)}</Row>
        <Row sample="hour-cycle" label={m.hour_cycle_label({}, o)}>{['h11', 'h12'].includes(info.hourCycle) ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o)}</Row>
        {info.firstDay && <Row sample="week-start" label={m.week_start_label({}, o)}>{weekdayName(locale, info.firstDay)}</Row>}
        {extras.systems}
      </Group>
      <Group title={m.dates_heading({}, o)}>
        <Row sample="instant" label={m.instant_label({}, o)}><time dateTime={samples.instant.toISOString()}>{m.instant_value({ instant: samples.instant }, o)}</time></Row>
        <Row sample="date" label={m.plain_date_label({}, o)}><time dateTime={samples.date.toISOString().slice(0, 10)}>{m.plain_date_value({ date: samples.date }, o)}</time></Row>
        {extras.dates}
        <Row sample="relative" label={m.relative_label({}, o)}>{m.relative_value({ days: samples.days }, o)}</Row>
        <Row sample="local-row" label={m.local_time_label({}, o)}><DeviceTime locale={locale} instant={samples.instant} data-sample="local" /></Row>
      </Group>
      <Group title={m.numbers_heading({}, o)}>
        <Row sample="decimal" label={m.decimal_label({}, o)}>{m.decimal_value({ value: samples.decimal }, o)}</Row>
        <Row sample="percent" label={m.percent_label({}, o)}>{m.percent_value({ value: samples.share }, o)}</Row>
        <Row sample="compact" label={m.compact_label({}, o)}>{m.compact_value({ value: samples.big }, o)}</Row>
      </Group>
      <Group title={m.currency_heading({}, o)}>
        <Row sample="currency" label={m.currency_label({}, o)}>{m.currency_value({ amount: samples.amount }, o)}</Row>
        {extras.currency}
      </Group>
      <Card><CardHeader><CardTitle>{m.plural_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.counts.map(count => <li key={count}><Badge variant="outline" data-count={count}>{m.apps_count({ count }, o)}</Badge></li>)}</ul></CardContent></Card>
      <Card><CardHeader><CardTitle>{m.ordinal_heading({}, o)}</CardTitle></CardHeader>
        <CardContent><ul className="flex flex-wrap gap-2">{samples.positions.map(n => <li key={n}><Badge variant="outline" data-position={n}>{m.position_value({ n }, o)}</Badge></li>)}</ul></CardContent></Card>
      {extras.after}
    </section>
  </Shell>;
}
