import { Links, Meta, Outlet, Scripts, ScrollRestoration, isRouteErrorResponse } from 'react-router';
import { getLocale, direction } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { languageMiddleware, suggestedLocale } from '@joeblew999/remy-ui/react-router';
import type { Route } from './+types/root';
import './styles.css';

/** Paraglide scopes the locale to each request and redirects un-localized document requests. */
export const middleware: Route.MiddlewareFunction[] = [languageMiddleware];

/** The public origin for canonical links, and a language worth offering on this page, if any. */
export function loader({ request }: Route.LoaderArgs) {
  return { origin: new URL(request.url).origin, preferred: suggestedLocale(request) };
}
export function Layout({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return <html lang={locale} dir={direction(locale)}><head>
    <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" /><Meta /><Links />
  </head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}
export default function App() { return <Outlet />; }
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const locale = getLocale();
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="error-page"><meta name="robots" content="noindex" />
    <title>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</title>
    <h1>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</h1>
    <p>{missing ? m.not_found_detail({}, { locale }) : m.error_detail({}, { locale })}</p>
    <a href={`/${locale}`}>{m.home_link({}, { locale })}</a>
  </main>;
}
