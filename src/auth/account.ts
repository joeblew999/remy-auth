import { env } from 'cloudflare:workers';
import { ORPCError } from '@orpc/client';
import { createServerFn } from '@tanstack/react-start';
import { setResponseHeader } from '@tanstack/react-start/server';
import { client } from '../api/client';
import { canSendCodes } from './mail.server';

/**
 * What the account page shows: who is signed in, or null, and whether signing in is possible here.
 * `account` is the contract's `me`, called through the API client inside the server (the router
 * itself, behind the guard, with the page's own cookies). A server function, so the page's loader gets
 * the same answer while the server renders and from the browser, where "nobody is signed in" is an
 * answer and not a failed request: `me` itself refuses a stranger with 401. `canSignIn` is false
 * where no sign-in code can be delivered (no mail delivery yet): the page then keeps its honest empty
 * state instead of offering a form that cannot work.
 */
export const accountState = createServerFn({ method: 'GET' }).handler(async () => {
  // About one person: never kept by a cache.
  setResponseHeader('Cache-Control', 'no-store');
  const canSignIn = canSendCodes(env);
  try {
    return { account: await client.me(), canSignIn };
  } catch (error) {
    if (error instanceof ORPCError && error.code === 'UNAUTHORIZED') return { account: null, canSignIn };
    throw error;
  }
});
