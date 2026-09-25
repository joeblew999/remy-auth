import { QueryClient } from '@tanstack/react-query';
import { createRouter } from '@tanstack/react-router';
import { setupRouterSsrQueryIntegration } from '@tanstack/react-router-ssr-query';
import { localeRewrite } from '@joeblew999/remy-ui/tanstack';
import { routeTree } from './routeTree.gen';

/**
 * One router per request on the server and one in the browser; routes carry no locale, the rewrite adds it.
 * Each router gets its own QueryClient, so no request ever sees another's cached queries. The SSR
 * integration dehydrates the queries a server render filled, streams late ones, and wraps the app
 * in the QueryClientProvider.
 */
export function getRouter() {
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
  });
  setupRouterSsrQueryIntegration({ router, queryClient });
  return router;
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
