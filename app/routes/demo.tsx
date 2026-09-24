import { useState } from 'react';
import { useLocation } from 'react-router';
import { isLocale, baseLocale } from '@joeblew999/remy-ui/locale';
import { Button } from '@joeblew999/remy-ui/button';
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
  return <main className="error-page"><p role="status">{m.loading({}, { locale })}</p></main>;
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
    <section className="demo-content">
      <a className="back-link" href={`/${locale}`}><span aria-hidden="true" className="back-arrow" />{m.home_link({}, o)}</a>
      <p className="eyebrow">{m.demo_label({}, o)}</p>
      <h1>{m.demo_title({}, o)}</h1>
      <p className="intro">{m.demo_description({}, o)}</p>
      <div className="counter-card">
        <p>{m.count_label({}, o)}</p>
        <output aria-live="polite" className="count">{new Intl.NumberFormat(locale).format(count)}</output>
        <div className="actions"><Button onClick={() => setCount(value => value + 1)}>{m.increment({}, o)}</Button>
          <Button variant="outline" onClick={() => setCount(0)} disabled={count === 0}>{m.reset({}, o)}</Button></div>
      </div>
      <form className="counter-card reserve" noValidate onSubmit={reserve} aria-labelledby="reserve-heading">
        <h2 id="reserve-heading">{m.form_heading({}, o)}</h2>
        <div className="field">
          <label htmlFor="name">{m.name_label({}, o)}</label>
          <input id="name" name="name" dir="auto" autoComplete="name" aria-invalid={errors.name ? true : undefined}
            aria-describedby={errors.name ? 'name-error' : undefined} />
          {errors.name && <p id="name-error" className="field-error">{errors.name}</p>}
        </div>
        <div className="field">
          <label htmlFor="guests">{m.guests_label({}, o)}</label>
          <input id="guests" name="guests" type="number" inputMode="numeric" min={1} max={20} step={1} defaultValue={2}
            aria-invalid={errors.guests ? true : undefined} aria-describedby={errors.guests ? 'guests-error' : undefined} />
          {errors.guests && <p id="guests-error" className="field-error">{errors.guests}</p>}
        </div>
        <div className="actions"><Button type="submit">{m.submit({}, o)}</Button></div>
        <p role="status" className="reserved">{reservation && m.reserved({ name: reservation.name, count: reservation.count }, o)}</p>
      </form>
      <p className="demo-note">{m.demo_note({}, o)}</p>
    </section>
  </Shell>;
}
