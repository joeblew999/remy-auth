import { useState } from 'react';
import { useLocation } from 'react-router';
import { isLocale, baseLocale } from '@joeblew999/remy-ui/locale';
import { ArrowLeftIcon } from 'lucide-react';
import { Button } from '@joeblew999/remy-ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@joeblew999/remy-ui/components/card';
import { Field, FieldError, FieldGroup, FieldLabel } from '@joeblew999/remy-ui/components/field';
import { Input } from '@joeblew999/remy-ui/components/input';
import { m } from '@joeblew999/remy-ui/messages';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import { pageMeta } from '../seo';
import type { Route } from './+types/demo';

export function loader({ params }: Route.LoaderArgs) { return { locale: requireLocale(params.locale) }; }
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) { return serverLoader(); }
clientLoader.hydrate = true as const;
export function HydrateFallback() {
  const segment = useLocation().pathname.split('/')[1];
  const locale = isLocale(segment) ? segment : baseLocale;
  return <main className="mx-auto max-w-3xl px-6 py-20"><p role="status">{m.loading({}, { locale })}</p></main>;
}
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '/demo', locale => m.demo_title({}, { locale }), locale => m.demo_description({}, { locale }));
}
export default function Demo({ loaderData: { locale } }: Route.ComponentProps) {
  const o = { locale };
  const [count, setCount] = useState(0);
  const [errors, setErrors] = useState<{ name?: string; guests?: string }>({});
  const [reservation, setReservation] = useState<{ name: string; count: number } | null>(null);
  function reserve(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = String(data.get('name') ?? '').trim();
    const guests = Number(data.get('guests'));
    const next: typeof errors = {};
    if (!name) next.name = m.name_required({}, o);
    if (!Number.isInteger(guests) || guests < 1 || guests > 20) next.guests = m.guests_invalid({}, o);
    setErrors(next);
    setReservation(Object.keys(next).length ? null : { name, count: guests });
  }
  return <Shell locale={locale} path="/demo">
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <a className="inline-flex items-center gap-1 text-sm text-muted-foreground" href={`/${locale}`}><ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />{m.home_link({}, o)}</a>
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.demo_label({}, o)}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{m.demo_title({}, o)}</h1>
      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{m.demo_description({}, o)}</p>
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
          <form noValidate onSubmit={reserve} className="flex flex-col gap-6">
            <FieldGroup>
              <Field data-invalid={errors.name ? true : undefined}>
                <FieldLabel htmlFor="name">{m.name_label({}, o)}</FieldLabel>
                <Input id="name" name="name" dir="auto" autoComplete="name" aria-invalid={errors.name ? true : undefined} aria-describedby={errors.name ? 'name-error' : undefined} />
                {errors.name && <FieldError id="name-error">{errors.name}</FieldError>}
              </Field>
              <Field data-invalid={errors.guests ? true : undefined}>
                <FieldLabel htmlFor="guests">{m.guests_label({}, o)}</FieldLabel>
                <Input id="guests" name="guests" type="number" inputMode="numeric" min={1} max={20} step={1} defaultValue={2} aria-invalid={errors.guests ? true : undefined} aria-describedby={errors.guests ? 'guests-error' : undefined} />
                {errors.guests && <FieldError id="guests-error">{errors.guests}</FieldError>}
              </Field>
            </FieldGroup>
            <div><Button type="submit">{m.submit({}, o)}</Button></div>
            <p role="status" className="reserved min-h-6">{reservation && m.reserved({ name: reservation.name, count: reservation.count }, o)}</p>
          </form>
        </CardContent>
      </Card>
      <p className="text-sm leading-relaxed text-muted-foreground">{m.demo_note({}, o)}</p>
    </section>
  </Shell>;
}
