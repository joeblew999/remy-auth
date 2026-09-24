import { buttonVariants } from '@joeblew999/remy-ui/components/button';
import { m } from '@joeblew999/remy-ui/messages';
import { Shell } from '../shell';
import { requireLocale } from '../locale';
import { pageMeta } from '../seo';
import type { Route } from './+types/home';

export function loader({ params }: Route.LoaderArgs) { return { locale: requireLocale(params.locale) }; }
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '', locale => m.home_title({}, { locale }), locale => m.home_description({}, { locale }));
}
export default function Home({ loaderData: { locale } }: Route.ComponentProps) {
  const o = { locale };
  return <Shell locale={locale}>
    <section className="mx-auto flex max-w-2xl flex-col gap-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{m.public_label({}, o)}</p>
      <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{m.home_title({}, o)}</h1>
      <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{m.home_intro({}, o)}</p>
      <div className="flex flex-wrap gap-3">
        <a className={buttonVariants({ size: 'lg' })} href={`/${locale}/demo`}>{m.demo_link({}, o)}</a>
        <a className={buttonVariants({ size: 'lg', variant: 'outline' })} href={`/${locale}/formats`}>{m.formats_link({}, o)}</a>
      </div>
    </section>
  </Shell>;
}
