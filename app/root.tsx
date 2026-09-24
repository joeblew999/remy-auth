import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, useMatches, isRouteErrorResponse } from 'react-router';
import { isLocale, baseLocale, direction, type Locale } from '@remy/ui/locale';
import { m } from '@remy/ui/messages';
import { chosenLocale, matchLocale } from './locale';
import type { Route } from './+types/root';
import './styles.css';

/** The public origin for canonical links, and the language the visitor prefers (chosen on this device, else by Accept-Language). */
export function loader({ request }: Route.LoaderArgs) {
  const chosen = chosenLocale(request.headers.get('cookie'));
  return { origin: new URL(request.url).origin, preferred: chosen ?? matchLocale(request.headers.get('accept-language')) };
}

/** The locale of the rendered route: from its loader data, else the URL's first segment, else the base locale. */
function useDocumentLocale(): Locale {
  const fromLoader = useMatches().map(match => (match.loaderData as { locale?: string } | undefined)?.locale).reverse().find(isLocale);
  const segment = useLocation().pathname.split('/')[1];
  return fromLoader ?? (isLocale(segment) ? segment : baseLocale);
}
export function Layout({ children }: { children: React.ReactNode }) {
  const locale = useDocumentLocale();
  return <html lang={locale} dir={direction(locale)}><head>
    <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" /><Meta /><Links />
  </head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}
export default function App() { return <Outlet />; }
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const locale = useDocumentLocale();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="error-page"><meta name="robots" content="noindex" />
    <title>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</title>
    <h1>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</h1>
    <p>{missing ? m.not_found_detail({}, { locale }) : m.error_detail({}, { locale })}</p>
    <a href={`/${locale}`}>{m.home_link({}, { locale })}</a>
  </main>;
}
