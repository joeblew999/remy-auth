import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { useForm, useStore } from '@tanstack/react-form';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { LanguageHint, LanguageMenu } from './language';
import { useTheme } from './theme';
import { UserIcon, XIcon } from 'lucide-react';
import { Skeleton } from './components/skeleton';
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from './components/empty';
import { canonicalTimeZone, timeZoneName, timeZonePath } from './showcase/time-zone';
import { Button, buttonVariants } from './components/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from './components/field';
import { Input } from './components/input';
import { SidebarInset, SidebarProvider } from './components/sidebar';
import { AppSidebar } from './blocks/sidebar-16/components/app-sidebar';
import { SiteHeader } from './blocks/sidebar-16/components/site-header';
import { BottomNav } from './blocks/bottom-nav/bottom-nav';
import { FormatsContent, type FormatsControlCards, type FormatsExtras } from './pages';
import { Intro, SkipLink, ZoneBadge } from './shell';
import { formatLocale, type LocaleInfo } from './locale-info';
import { reservationSchema, type Reservation, type ReservationDraft, type ReservationResult } from './reservation';

// App pages (paths.js): they need JavaScript and use the app shell. Kept apart from ./pages, the
// site pages, so a site page never downloads the app shell's code.

/**
 * The frame of an app page: shadcn's sidebar-16 block (blocks/sidebar-16), a sticky site header
 * with the sidebar toggle, then the sidebar with the app's pages; on phones the bottom bar instead
 * (blocks/bottom-nav). Needs JavaScript.
 */
export function AppShell({ locale, path = '/app', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  return <div className="[--header-height:calc(--spacing(14))]">
    <SkipLink locale={locale} />
    <SidebarProvider className="flex flex-col">
      <SiteHeader locale={locale} path={path} />
      <div className="flex flex-1">
        <AppSidebar locale={locale} />
        <SidebarInset>
          {/* Room below the content for the phone's bottom bar (4rem and the home indicator). */}
          <div className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8">
            <LanguageHint locale={locale} path={path} preferred={preferred} />
            <main id="main" className="w-full flex-1">{children}</main>
            <footer><ZoneBadge locale={locale} app /></footer>
          </div>
        </SidebarInset>
      </div>
      <BottomNav locale={locale} />
    </SidebarProvider>
  </div>;
}

/** The app's home page: what the app side is, then whatever the app shows there (for example the live status). */
export function AppHomePage({ locale, preferred, children }: { locale: Locale; preferred?: Locale; children?: React.ReactNode }) {
  const o = { locale };
  return <AppShell locale={locale} path="/app" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} back={false} title={m.app_home_title({}, o)} intro={m.app_home_intro({}, o)} />
      <div className="flex flex-wrap gap-3">
        <Link className={buttonVariants({ size: 'lg' })} to="/app/demo" preload="intent">{m.demo_link({}, o)}</Link>
        <Link className={buttonVariants({ size: 'lg', variant: 'outline' })} to="/app/location" preload="intent">{m.nav_location({}, o)}</Link>
      </div>
      {children}
    </section>
  </AppShell>;
}

/** The app's location page: the device's location beside the network's, which the app passes in. */
export function LocationPage({ locale, preferred, children }: { locale: Locale; preferred?: Locale; children: React.ReactNode }) {
  const o = { locale };
  return <AppShell locale={locale} path="/app/location" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} title={m.location_title({}, o)} intro={m.location_intro({}, o)} backTo="/app" />
      {children}
    </section>
  </AppShell>;
}

/** The formats page inside the app: the same content as the site page, in the app frame. */
export function AppFormatsPage({ locale, info, preferred, extras = {}, controls = {} }: { locale: Locale; info: LocaleInfo; preferred?: Locale; extras?: FormatsExtras; controls?: FormatsControlCards }) {
  return <AppShell locale={locale} path="/app/formats" preferred={preferred}><FormatsContent locale={locale} info={info} extras={extras} controls={controls} backTo="/app" /></AppShell>;
}

/** The demo form's starting values: no name, two seats, written in the language's own digits. */
const draft = (locale: Locale): ReservationDraft => ({ name: '', guests: new Intl.NumberFormat(formatLocale(locale)).format(2) });

export type { Reservation, ReservationResult } from './reservation';

export function DemoPage({ locale, preferred, onReserve, onDirtyChange }: {
  locale: Locale; preferred?: Locale;
  /** Called once the form's own validation passes, for example an API call whose server validates again. Without it the form confirms locally. */
  onReserve?: (reservation: Reservation) => ReservationResult | Promise<ReservationResult>;
  /** Told whenever the form holds input that has not been reserved yet, for example to warn before leaving. */
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const o = { locale };
  const [count, setCount] = useState(0);
  const [reservation, setReservation] = useState<{ name: string; count: number; message?: string } | null>(null);
  const [failed, setFailed] = useState(false);
  const schema = reservationSchema(locale);
  // TanStack Form with shadcn's Field components (https://ui.shadcn.com/docs/forms/tanstack-form):
  // the shared Zod schema checks on submit, and the server's field errors join the form's own.
  const form = useForm({
    defaultValues: draft(locale),
    validators: { onSubmit: schema },
    onSubmitInvalid: () => { setFailed(false); setReservation(null); },
    onSubmit: async ({ value, formApi }) => {
      const accepted = schema.parse(value);
      let result: ReservationResult;
      try {
        result = onReserve ? await onReserve(accepted) : {};
      } catch {
        setReservation(null);
        setFailed(true);
        return;
      }
      setFailed(false);
      const { name, guests } = result.errors ?? {};
      if (name || guests) {
        setReservation(null);
        formApi.setErrorMap({ onSubmit: { form: undefined, fields: {
          ...(name ? { name: [{ message: name }] } : {}),
          ...(guests ? { guests: [{ message: guests }] } : {}),
        } } });
        return;
      }
      setReservation({ name: accepted.name, count: accepted.guests, message: result.message });
      // Reserved: the input is no longer unsaved. Keep it on screen, and keep the original defaults.
      formApi.reset(value, { keepDefaultValues: true });
    },
  });
  const dirty = useStore(form.store, state => state.isDirty);
  useEffect(() => onDirtyChange?.(dirty), [dirty]);
  // React keeps input typed before hydration (a prerendered page) in the DOM but not in state, and
  // fires no change for it: hand it to the form once hydrated.
  const element = useRef<HTMLFormElement>(null);
  useEffect(() => {
    const data = element.current && new FormData(element.current);
    for (const name of ['name', 'guests'] as const) {
      const typed = data?.get(name);
      if (typeof typed === 'string' && typed !== form.getFieldValue(name)) form.setFieldValue(name, typed);
    }
  }, []);
  return <AppShell locale={locale} path="/app/demo" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} label={m.demo_label({}, o)} title={m.demo_title({}, o)} intro={m.demo_description({}, o)} backTo="/app" />
      <Card>
        <CardHeader><CardTitle>{m.count_label({}, o)}</CardTitle></CardHeader>
        <CardContent className="flex flex-col gap-4">
          <output aria-live="polite" className="block text-6xl tabular-nums">{new Intl.NumberFormat(formatLocale(locale)).format(count)}</output>
          <div className="flex flex-wrap gap-3">
            <Button onClick={() => setCount(value => value + 1)}>{m.increment({}, o)}</Button>
            <Button variant="outline" onClick={() => setCount(0)} disabled={count === 0}>{m.reset({}, o)}</Button>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{m.form_heading({}, o)}</CardTitle></CardHeader>
        <CardContent>
          <form ref={element} noValidate className="flex flex-col gap-6" onSubmit={event => {
            event.preventDefault();
            // Submit errors answer the last attempt only: every submit checks, and asks the server, afresh.
            form.setErrorMap({ onSubmit: { form: undefined, fields: {} } });
            void form.handleSubmit();
          }}>
            <FieldGroup>
              <form.Field name="name" children={field => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>{m.name_label({}, o)}</FieldLabel>
                  <Input id={field.name} name={field.name} dir="auto" autoComplete="name" value={field.state.value} onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? 'name-error' : undefined} />
                  {isInvalid && <FieldError id="name-error" errors={field.state.meta.errors} />}
                </Field>;
              }} />
              {/* A text field, not type="number", which rejects digits other than 0-9: the shared
                  schema reads seats typed in any script's digits (Persian ۳, Arabic-Indic ٣). */}
              <form.Field name="guests" children={field => {
                const isInvalid = field.state.meta.isTouched && !field.state.meta.isValid;
                return <Field data-invalid={isInvalid || undefined}>
                  <FieldLabel htmlFor={field.name}>{m.guests_label({}, o)}</FieldLabel>
                  <Input id={field.name} name={field.name} inputMode="numeric" autoComplete="off" value={field.state.value} onBlur={field.handleBlur}
                    onChange={event => field.handleChange(event.target.value)} aria-invalid={isInvalid || undefined} aria-describedby={isInvalid ? 'guests-error' : undefined} />
                  {isInvalid && <FieldError id="guests-error" errors={field.state.meta.errors} />}
                </Field>;
              }} />
            </FieldGroup>
            <div><Button type="submit">{m.submit({}, o)}</Button></div>
            <p role="status" className="reserved min-h-6">{failed ? m.error_detail({}, o) : reservation && (reservation.message ?? m.reserved({ name: reservation.name, count: reservation.count }, o))}</p>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.demo_note({}, o)}</p>
    </section>
  </AppShell>;
}

/** The time now, ticking each second once the page runs in the browser; undefined on the server (no clock to disagree with). */
function useNow() {
  const [now, setNow] = useState<Date>();
  useEffect(() => {
    setNow(new Date());
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  return now;
}

/**
 * The clock: the time now here and in the zones the route keeps (for example in its search params, so a
 * set of zones is a link to share), each linking its time-zone page. The route passes the zones and is
 * told when they change.
 */
export function ClockPage({ locale, preferred, zones, onZonesChange }: { locale: Locale; preferred?: Locale; zones: string[]; onZonesChange: (zones: string[]) => void }) {
  const o = { locale };
  const now = useNow();
  const [here, setHere] = useState<string>();
  useEffect(() => setHere(Intl.DateTimeFormat().resolvedOptions().timeZone), []);
  const [draft, setDraft] = useState('');
  const [unknown, setUnknown] = useState<string>();
  const [known, setKnown] = useState<string[]>([]);
  useEffect(() => setKnown(Intl.supportedValuesOf?.('timeZone') ?? []), []);
  const time = (zone: string) => now && new Intl.DateTimeFormat(formatLocale(locale), { timeZone: zone, timeStyle: 'medium' }).format(now);
  const day = (zone: string) => now && new Intl.DateTimeFormat(formatLocale(locale), { timeZone: zone, weekday: 'long', day: 'numeric', month: 'long' }).format(now);
  const row = (zone: string, label?: string, remove = false) => <Card key={zone} size="sm">
    <CardContent className="flex flex-wrap items-center gap-x-4 gap-y-1">
      <div className="min-w-0 flex-1">
        <p className="font-medium">{label ?? timeZoneName(locale, zone, 'longGeneric')}</p>
        <p className="text-sm text-muted-foreground">
          <Link className="underline underline-offset-4" to={timeZonePath(zone)} preload="intent" aria-label={`${m.clock_about({}, o)}: ${zone}`}>{zone}</Link>
          {' · '}{timeZoneName(locale, zone, 'longOffset')}
        </p>
      </div>
      <div className="text-end">
        {now ? <p className="text-2xl tabular-nums">{time(zone)}</p> : <Skeleton className="h-8 w-28" />}
        {now && <p className="text-sm text-muted-foreground">{day(zone)}</p>}
      </div>
      {remove && <Button variant="ghost" size="sm" onClick={() => onZonesChange(zones.filter(value => value !== zone))} aria-label={m.clock_remove({ zone }, o)}><XIcon /></Button>}
    </CardContent>
  </Card>;
  return <AppShell locale={locale} path="/app/clock" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} title={m.clock_title({}, o)} intro={m.clock_intro({}, o)} backTo="/app" />
      <div className="flex flex-col gap-3">
        {here && row(here, m.clock_here({}, o))}
        {zones.filter(zone => zone !== here).map(zone => row(zone, undefined, true))}
      </div>
      <form className="flex flex-wrap items-end gap-3" onSubmit={event => {
        event.preventDefault();
        const zone = canonicalTimeZone(draft.trim());
        if (!zone) { setUnknown(draft.trim()); return; }
        setUnknown(undefined);
        setDraft('');
        if (!zones.includes(zone)) onZonesChange([...zones, zone]);
      }}>
        <Field className="min-w-0 flex-1" data-invalid={unknown ? true : undefined}>
          <FieldLabel htmlFor="clock-zone">{m.clock_add({}, o)}</FieldLabel>
          <Input id="clock-zone" list="clock-zones" dir="ltr" autoComplete="off" placeholder="Asia/Tokyo" value={draft} onChange={event => setDraft(event.target.value)}
            aria-invalid={unknown ? true : undefined} aria-describedby={unknown ? 'clock-zone-error' : undefined} />
          <datalist id="clock-zones">{known.map(zone => <option key={zone} value={zone} />)}</datalist>
          {unknown && <FieldError id="clock-zone-error">{m.zone_not_found({ zone: unknown }, o)}</FieldError>}
        </Field>
        <Button type="submit">{m.clock_add_button({}, o)}</Button>
      </form>
    </section>
  </AppShell>;
}

/** Settings: the language and the appearance (kept on this device), and what the device tells the app. */
export function SettingsPage({ locale, preferred }: { locale: Locale; preferred?: Locale }) {
  const o = { locale };
  const { theme, setTheme } = useTheme();
  const [device, setDevice] = useState<{ zone: string; languages: readonly string[] }>();
  useEffect(() => setDevice({ zone: Intl.DateTimeFormat().resolvedOptions().timeZone, languages: navigator.languages }), []);
  const themes = [['light', m.theme_light({}, o)], ['dark', m.theme_dark({}, o)], ['system', m.theme_system({}, o)]] as const;
  return <AppShell locale={locale} path="/app/settings" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} title={m.settings_title({}, o)} intro={m.settings_intro({}, o)} backTo="/app" />
      <Card>
        <CardHeader><CardTitle>{m.settings_language({}, o)}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground">{m.settings_language_hint({}, o)}</p>
          <LanguageMenu locale={locale} />
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{m.settings_appearance({}, o)}</CardTitle></CardHeader>
        <CardContent className="flex flex-wrap gap-2" role="group" aria-label={m.settings_appearance({}, o)}>
          {themes.map(([value, label]) => <Button key={value} variant={theme === value ? 'default' : 'outline'} aria-pressed={theme === value} onClick={() => setTheme(value)}>{label}</Button>)}
        </CardContent>
      </Card>
      <Card>
        <CardHeader><CardTitle>{m.settings_device({}, o)}</CardTitle></CardHeader>
        <CardContent>
          <dl className="grid gap-x-6 gap-y-2 sm:grid-cols-[auto_1fr]">
            <dt className="text-muted-foreground">{m.settings_time_zone({}, o)}</dt>
            <dd dir="ltr" className="text-start">{device ? device.zone : <Skeleton className="h-5 w-32" />}</dd>
            <dt className="text-muted-foreground">{m.settings_languages({}, o)}</dt>
            <dd dir="ltr" className="text-start">{device ? device.languages.join(', ') : <Skeleton className="h-5 w-40" />}</dd>
          </dl>
        </CardContent>
      </Card>
    </section>
  </AppShell>;
}

/** The account: an honest empty state until the auth service signs people in (.plans/parked/auth-service.md). */
export function AccountPage({ locale, preferred }: { locale: Locale; preferred?: Locale }) {
  const o = { locale };
  return <AppShell locale={locale} path="/app/account" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} title={m.account_title({}, o)} intro={m.account_intro({}, o)} backTo="/app" />
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon"><UserIcon /></EmptyMedia>
          <EmptyTitle>{m.account_empty_title({}, o)}</EmptyTitle>
          <EmptyDescription>{m.account_empty_description({}, o)}</EmptyDescription>
        </EmptyHeader>
        <EmptyContent><Link className={buttonVariants({ variant: 'outline' })} to="/app/settings" preload="intent">{m.nav_settings({}, o)}</Link></EmptyContent>
      </Empty>
    </section>
  </AppShell>;
}
