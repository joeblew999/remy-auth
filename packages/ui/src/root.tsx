import { HeadContent, Outlet, Scripts, useLoaderData } from '@tanstack/react-router';
import type { QueryClient } from '@tanstack/react-query';
import { createIsomorphicFn } from '@tanstack/react-start';
import { getRequest } from '@tanstack/react-start/server';
import { AppProviders } from './providers';
import { NotFound, ErrorPage } from './problem';
import { suggestedLocale, suggestedLocaleInBrowser } from './tanstack';
import { getLocale, direction } from './locale';
import type { RemyApp } from './app-config';

// The root route every server-rendered app has (.plans/thin-apps.md, group 5): the document with the page's
// language and direction, AppProviders with the app's config and the language worth offering, the problem
// pages. The app's src/routes/__root.tsx is one call, with its stylesheet import and TanStack Devtools:
//
//   export const Route = createRootRouteWithContext<RemyRouterContext>()(remyRoot(remyApp, {
//     devtools: <TanStackDevtools plugins={[...]} />,
//   }));
//
// The devtools stay in the app's file because TanStack's devtools Vite plugin strips them from production
// builds only outside node_modules (it replaces the element with null there).

/** The router context every app's root declares: getRouter's per-request QueryClient (router.tsx). */
export type RemyRouterContext = { queryClient: QueryClient };

/**
 * The language to offer on this page: from the request's cookie and Accept-Language on the server, from the
 * browser's after hydration. The root loader returns it as `preferred`; AppProviders hands it to every frame.
 */
export const preferredLocale = createIsomorphicFn()
  .server(() => suggestedLocale(getRequest()))
  .client(() => suggestedLocaleInBrowser(getLocale()));

type RootOptions = {
  /** TanStack Devtools, written in the app's root file (see above); none in production. */
  devtools?: React.ReactNode;
  /** The favicon's path under public/, default /favicon.svg. */
  icon?: string;
};

/** The root route's options for an app: spread into createRootRouteWithContext<RemyRouterContext>()(...). */
export function remyRoot(app: RemyApp, { devtools, icon = '/favicon.svg' }: RootOptions = {}) {
  function Document({ children }: { children: React.ReactNode }) {
    const locale = getLocale();
    const preferred = useLoaderData({ strict: false, select: data => (data as { preferred?: ReturnType<typeof preferredLocale> } | undefined)?.preferred });
    return <html lang={locale} dir={direction(locale)} suppressHydrationWarning>
      <head><HeadContent /></head>
      <body><AppProviders locale={locale} app={app} preferred={preferred}>{children}</AppProviders>
        {devtools}
        <Scripts /></body>
    </html>;
  }
  return {
    // Cheap, so it reruns on every navigation.
    loader: () => ({ preferred: preferredLocale() }),
    head: () => ({
      meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
      links: [{ rel: 'icon', href: icon, type: icon.endsWith('.svg') ? 'image/svg+xml' : undefined }],
    }),
    shellComponent: Document,
    component: Outlet,
    notFoundComponent: NotFound,
    errorComponent: ErrorPage,
  };
}
