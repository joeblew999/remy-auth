import { remyRouter } from '@joeblew999/remy-ui/router';
import { routeTree } from './routeTree.gen';

export const getRouter = () => remyRouter(routeTree);

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>;
  }
}
