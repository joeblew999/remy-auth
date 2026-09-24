import { buttonVariants } from '@remy/ui/button';
import { m } from '@remy/ui/messages';
import { locales } from '@remy/ui/locale';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import { pageMeta } from '../seo';
import type { Route } from './+types/home';

export function loader({ params }: Route.LoaderArgs) { return { locale: requireLocale(params.locale) }; }
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '', locale => m.home_title({}, { locale }), locale => m.home_description({}, { locale }));
}
export default function Home({ loaderData: { locale } }: Route.ComponentProps) {
  return <Shell locale={locale}>
    <section className="hero">
      <p className="eyebrow"><span className="status-dot" />{m.public_label({}, { locale })}</p>
      <h1>{m.home_title({}, { locale })}</h1>
      <p className="intro">{m.home_intro({}, { locale })}</p>
      <div className="hero-actions">
        <a className={buttonVariants({ size: 'lg' })} href={`/${locale}/demo`}>
          {m.demo_link({}, { locale })}<span aria-hidden="true">↗</span>
        </a>
        <a className={buttonVariants({ size: 'lg', variant: 'outline' })} href={`/${locale}/formats`}>
          {m.formats_link({}, { locale })}
        </a>
      </div>
    </section>
    <div className="visual-card" aria-hidden="true">
      <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
      <div className="visual-tile tile-back">r.</div><div className="visual-tile tile-front">r.</div>
      <span className="visual-caption">{locales.map(value => value.toUpperCase()).join(' · ')}</span>
    </div>
  </Shell>;
}
