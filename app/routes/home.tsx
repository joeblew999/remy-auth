import { buttonVariants } from '@remy/ui/button';
import { m } from '@remy/ui/messages';
import { locales } from '@remy/ui/locale';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import type { Route } from './+types/home';

export function loader({ params, request }: Route.LoaderArgs) {
  return { locale: requireLocale(params.locale), origin: new URL(request.url).origin };
}
export function meta({ loaderData }: Route.MetaArgs) {
  if (!loaderData) return [];
  const { locale, origin } = loaderData;
  return [
    { title: `${m.home_title({}, { locale })} | Remy` },
    { name: 'description', content: m.home_description({}, { locale }) },
    { tagName: 'link', rel: 'canonical', href: `${origin}/${locale}` },
    ...locales.map(value => ({ tagName: 'link', rel: 'alternate', hrefLang: value, href: `${origin}/${value}` })),
    { tagName: 'link', rel: 'alternate', hrefLang: 'x-default', href: `${origin}/en` },
  ];
}
export default function Home({ loaderData: { locale } }: Route.ComponentProps) {
  return <Shell locale={locale}>
    <section className="hero">
      <p className="eyebrow"><span className="status-dot" />{m.public_label({}, { locale })}</p>
      <h1>{m.home_title({}, { locale })}</h1>
      <p className="intro">{m.home_intro({}, { locale })}</p>
      <a className={buttonVariants({ size: 'lg' })} href={`/${locale}/demo`}>
        {m.demo_link({}, { locale })}<span aria-hidden="true">↗</span>
      </a>
    </section>
    <div className="visual-card" aria-hidden="true">
      <div className="visual-orbit orbit-one" /><div className="visual-orbit orbit-two" />
      <div className="visual-tile tile-back">r.</div><div className="visual-tile tile-front">r.</div>
      <span className="visual-caption">EN · ES</span>
    </div>
  </Shell>;
}
