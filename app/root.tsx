import { Links, Meta, Outlet, Scripts, ScrollRestoration, useLocation, isRouteErrorResponse } from 'react-router';
import { isLocale, baseLocale } from '@remy/ui/locale';
import { m } from '@remy/ui/messages';
import type { Route } from './+types/root';
import './styles.css';

export function Layout({ children }: { children: React.ReactNode }) {
  const segment = useLocation().pathname.split('/')[1];
  const locale = isLocale(segment) ? segment : baseLocale;
  return <html lang={locale} dir="ltr"><head>
    <meta charSet="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" />
    <link rel="icon" href="/favicon.svg" type="image/svg+xml" /><Meta /><Links />
  </head><body>{children}<ScrollRestoration /><Scripts /></body></html>;
}
export default function App() { return <Outlet />; }
export function ErrorBoundary({ error }: Route.ErrorBoundaryProps) {
  const segment = useLocation().pathname.split('/')[1];
  const locale = isLocale(segment) ? segment : baseLocale;
  const missing = isRouteErrorResponse(error) && error.status === 404;
  return <main className="error-page"><meta name="robots" content="noindex" />
    <title>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</title>
    <h1>{missing ? m.not_found({}, { locale }) : m.error_title({}, { locale })}</h1>
    <p>{missing ? m.not_found_detail({}, { locale }) : m.error_detail({}, { locale })}</p>
    <a href={`/${locale}`}>{m.home_link({}, { locale })}</a>
  </main>;
}
