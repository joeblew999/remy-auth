import { createRouter } from '@tanstack/react-router';
import { getGlobalStartContext } from '@tanstack/react-start';
import { routeTree } from './routeTree.gen';

/** One router per request on the server and one in the browser, as Fumadocs' template has it; the CSP nonce on every script. */
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ssr: { nonce: getGlobalStartContext()?.nonce },
  });
}
