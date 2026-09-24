import { useState } from 'react';
import { useLocation } from 'react-router';
import { isLocale, baseLocale } from '@remy/ui/locale';
import { Button } from '@remy/ui/button';
import { m } from '@remy/ui/messages';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import type { Route } from './+types/demo';

export function loader({ params }: Route.LoaderArgs) { return { locale: requireLocale(params.locale) }; }
export async function clientLoader({ serverLoader }: Route.ClientLoaderArgs) { return serverLoader(); }
clientLoader.hydrate = true as const;
export function HydrateFallback() {
  const segment = useLocation().pathname.split('/')[1];
  const locale = isLocale(segment) ? segment : baseLocale;
  return <main className="error-page"><p role="status">{m.loading({}, { locale })}</p></main>;
}
export function meta({ loaderData }: Route.MetaArgs) {
  return [{ title: loaderData ? `${m.demo_title({}, { locale: loaderData.locale })} | Remy` : 'Remy' },
    { name: 'robots', content: 'noindex, nofollow' }];
}
export default function Demo({ loaderData: { locale } }: Route.ComponentProps) {
  const [count, setCount] = useState(0);
  return <Shell locale={locale} demo>
    <section className="demo-content">
      <a className="back-link" href={`/${locale}`}>← {m.home_link({}, { locale })}</a>
      <p className="eyebrow">{m.demo_label({}, { locale })}</p>
      <h1>{m.demo_title({}, { locale })}</h1>
      <p className="intro">{m.demo_description({}, { locale })}</p>
      <div className="counter-card">
        <p>{m.count_label({}, { locale })}</p>
        <output aria-live="polite" className="count">{new Intl.NumberFormat(locale).format(count)}</output>
        <div className="actions"><Button onClick={() => setCount(value => value + 1)}>{m.increment({}, { locale })}</Button>
          <Button variant="outline" onClick={() => setCount(0)} disabled={count === 0}>{m.reset({}, { locale })}</Button></div>
      </div>
      <p className="demo-note">{m.demo_note({}, { locale })}</p>
    </section>
  </Shell>;
}
