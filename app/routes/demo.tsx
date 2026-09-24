import { useLocation } from 'react-router';
import { isLocale, baseLocale } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { DemoPage } from '@joeblew999/remy-ui/pages';
import { requireLocale } from '@joeblew999/remy-ui/react-router';
import { pageMeta } from '../seo';
import { usePreferred } from '../preferred';
import type { Route } from './+types/demo';

// Rendered in the browser: the server sends the document shell and a loading fallback.
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
  return <DemoPage locale={locale} preferred={usePreferred()} />;
}
