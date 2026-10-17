import { remyRouter } from '@joeblew999/remy-ui/router';
import { routeTree } from './routeTree.gen';

// The shared router (@joeblew999/remy-ui/router): the locale rewrite, a QueryClient per request, the CSP nonce.
export const getRouter = () => remyRouter(routeTree);

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
