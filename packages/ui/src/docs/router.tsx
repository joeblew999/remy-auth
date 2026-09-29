import { createRouter } from '@tanstack/react-router';
import { getGlobalStartContext } from '@tanstack/react-start';
import { config } from 'zod';
import { routeTree } from './routeTree.gen';

// Zod (under the AI SDK of Ask AI) probes eval with Function(''); our CSP forbids eval, so the probe logs a
// violation. Zod's own switch for CSP pages skips it: https://zod.dev/api#jitless
config({ jitless: true });

/** One router per request on the server and one in the browser, as Fumadocs' template has it; the CSP nonce on every script. */
export function getRouter() {
  return createRouter({
    routeTree,
    defaultPreload: 'intent',
    scrollRestoration: true,
    ssr: { nonce: getGlobalStartContext()?.nonce },
  });
}
