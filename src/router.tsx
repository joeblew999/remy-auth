import { createRouter } from '@tanstack/react-router';
import { localeRewrite } from '@joeblew999/remy-ui/tanstack';
import { routeTree } from './routeTree.gen';

/** One router per request on the server and one in the browser; routes carry no locale, the rewrite adds it. */
export function getRouter() {
  return createRouter({
    routeTree,
    rewrite: localeRewrite,
    // Every in-app Link loads its route's code and data on hover, focus or touch.
    defaultPreload: 'intent',
    scrollRestoration: true,
  });
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
