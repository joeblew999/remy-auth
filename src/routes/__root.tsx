import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { getLocale, direction } from '@joeblew999/remy-ui/locale';
import { preferredLocale } from '../preferred';
import { NotFound, ErrorPage } from '../problem';
import styles from '../styles.css?url';

// Router context: the per-request QueryClient from getRouter (src/router.tsx).
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The language worth offering on this page, if any (see preferred.ts); cheap, so it reruns on every navigation.
  loader: () => ({ preferred: preferredLocale() }),
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }, { rel: 'stylesheet', href: styles }],
  }),
  shellComponent: Document,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

/** The document: Paraglide's locale for this request (server) or URL (browser) sets language and direction. */
function Document({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return <html lang={locale} dir={direction(locale)}>
    <head><HeadContent /></head>
    <body>{children}<Scripts /></body>
  </html>;
}
