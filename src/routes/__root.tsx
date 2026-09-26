import { HeadContent, Outlet, Scripts, createRootRouteWithContext } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { TanStackDevtools } from '@tanstack/react-devtools';
import { ReactQueryDevtoolsPanel } from '@tanstack/react-query-devtools';
import { TanStackRouterDevtoolsPanel } from '@tanstack/react-router-devtools';
import { getLocale, direction } from '@joeblew999/remy-ui/locale';
import { ThemeProvider } from '@joeblew999/remy-ui/theme';
import { DirectionProvider } from '@joeblew999/remy-ui/components/direction';
import { AppNavLinks, SiteNavLinks, SourceLink } from '@joeblew999/remy-ui/shell';
import { docsConfig } from '../../docs/docs.config';
import { docsAppLink, docsHeaderLink } from '../docs/header-link';
import { preferredLocale } from '../preferred';
import { NotFound, ErrorPage } from '@joeblew999/remy-ui/problem';
import '../styles.css';

// Router context: the per-request QueryClient from getRouter (src/router.tsx).
export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  // The language worth offering on this page, if any (see preferred.ts); cheap, so it reruns on every navigation.
  loader: () => ({ preferred: preferredLocale() }),
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  }),
  shellComponent: Document,
  component: Outlet,
  notFoundComponent: NotFound,
  errorComponent: ErrorPage,
});

/**
 * The document: Paraglide's locale for this request (server) or URL (browser) sets language and direction.
 * TanStack Devtools (Router and Query panels) mount here in development; the devtools() Vite plugin
 * strips them from production builds, which build-boundaries.checks.js proves on every served script.
 */
function Document({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return <html lang={locale} dir={direction(locale)} suppressHydrationWarning>
    <head><HeadContent /></head>
    <body><DirectionProvider direction={direction(locale)}><ThemeProvider defaultTheme="system" storageKey="theme">
      {/* The site header's "Docs" link (the docs Worker, docs/) and its source link (docs.config.ts names the repository once). */}
      <SourceLink value={docsConfig.repository}><SiteNavLinks value={docsHeaderLink(locale)}><AppNavLinks value={docsAppLink(locale)}>{children}</AppNavLinks></SiteNavLinks></SourceLink></ThemeProvider></DirectionProvider>
      <TanStackDevtools plugins={[
        { name: 'TanStack Router', render: <TanStackRouterDevtoolsPanel /> },
        { name: 'TanStack Query', render: <ReactQueryDevtoolsPanel /> },
      ]} />
      <Scripts /></body>
  </html>;
}
