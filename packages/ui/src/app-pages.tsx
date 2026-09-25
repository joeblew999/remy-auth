import { useEffect, useRef, useState } from 'react';
import { Link } from '@tanstack/react-router';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { LanguageHint } from './language';
import { Button, buttonVariants } from './components/button';
import { Card, CardContent, CardHeader, CardTitle } from './components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from './components/field';
import { Input } from './components/input';
import { SidebarInset, SidebarProvider } from './components/sidebar';
import { AppSidebar } from './blocks/sidebar-16/app-sidebar';
import { SiteHeader } from './blocks/sidebar-16/site-header';
import { Intro, ZoneBadge } from './pages';

// App pages (paths.js): they need JavaScript and use the app shell. Kept apart from ./pages, the
// site pages, so a site page never downloads the app shell's code.

/**
 * The frame of an app page: shadcn's sidebar-16 block (blocks/sidebar-16), a sticky site header
 * with the sidebar toggle, then the sidebar with the app's pages. Needs JavaScript.
 */
export function AppShell({ locale, path = '/app', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  return <div className="[--header-height:calc(--spacing(14))]">
    <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-60 focus:bg-background focus:p-3" href="#main">{m.skip_link({}, { locale })}</a>
    <SidebarProvider className="flex flex-col">
      <SiteHeader locale={locale} path={path} />
      <div className="flex flex-1">
        <AppSidebar locale={locale} />
        <SidebarInset>
          <div className="flex flex-1 flex-col gap-4 p-4 md:p-8">
            <LanguageHint locale={locale} path={path} preferred={preferred} />
            <main id="main" className="mx-auto w-full max-w-3xl flex-1"><div className="mb-6"><ZoneBadge locale={locale} app /></div>{children}</main>
          </div>
        </SidebarInset>
      </div>
    </SidebarProvider>
  </div>;
}

/** The app's home page: what the app side is, then whatever the app shows there (for example the live status). */
export function AppHomePage({ locale, preferred, children }: { locale: Locale; preferred?: Locale; children?: React.ReactNode }) {
  const o = { locale };
  return <AppShell locale={locale} path="/app" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} back={false} label={m.zone_app({}, o)} title={m.app_home_title({}, o)} intro={m.app_home_intro({}, o)} />
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
      <Intro locale={locale} label={m.zone_app({}, o)} title={m.location_title({}, o)} intro={m.location_intro({}, o)} backTo="/app" />
      {children}
    </section>
  </AppShell>;
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
  return <AppShell locale={locale} path="/app/demo" preferred={preferred}>
    <section className="flex flex-col gap-6">
      <Intro locale={locale} label={m.demo_label({}, o)} title={m.demo_title({}, o)} intro={m.demo_description({}, o)} backTo="/app" />
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
  </AppShell>;
}

