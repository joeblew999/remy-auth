import { m } from '@joeblew999/remy-ui/messages';
import { HomePage } from '@joeblew999/remy-ui/pages';
import { requireLocale } from '@joeblew999/remy-ui/react-router';
import { pageMeta } from '../seo';
import { usePreferred } from '../preferred';
import type { Route } from './+types/home';

export function loader({ params }: Route.LoaderArgs) { return { locale: requireLocale(params.locale) }; }
export function meta({ params, matches }: Route.MetaArgs) {
  return pageMeta(params, matches, '', locale => m.home_title({}, { locale }), locale => m.home_description({}, { locale }));
}
export default function Home({ loaderData: { locale } }: Route.ComponentProps) {
  return <HomePage locale={locale} preferred={usePreferred()} />;
}
