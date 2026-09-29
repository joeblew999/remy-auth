import { QueryClient } from '@tanstack/react-query';
import { createRouter, type AnyRoute } from '@tanstack/react-router';
import { getGlobalStartContext } from '@tanstack/react-start';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { localeRewrite } from './tanstack';

/**
 * The router every app makes (.plans/thin-apps.md, group 5); its src/router.tsx is
 * `export const getRouter = () => remyRouter(routeTree)` and TanStack's Register declaration.
 * One router per request on the server and one in the browser; routes carry no locale, the rewrite adds it.
 * Each router gets its own QueryClient, so no request ever sees another's cached queries. The SSR
 * integration dehydrates the queries a server render filled, streams late ones, and wraps the app
 * in the QueryClientProvider.
 */
export function remyRouter<TRouteTree extends AnyRoute>(routeTree: TRouteTree) {
  const queryClient = new QueryClient();
  const router = createRouter({
    routeTree,
    rewrite: localeRewrite,
    context: { queryClient },
    // Every in-app Link loads its route's code and data on hover, focus or touch. The routes'
    // own loaders keep the router's preload cache; data kept in Query is fresh or not by Query's
    // staleTime, because loaders only ensureQueryData.
    defaultPreload: 'intent',
    scrollRestoration: true,
    // The request's CSP nonce (start.ts, cspNonce) on every script and head tag the server renders;
    // undefined in the browser, which needs none.
    ssr: { nonce: getGlobalStartContext()?.nonce },
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}
