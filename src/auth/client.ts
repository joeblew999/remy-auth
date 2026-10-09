import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';
import { getLocale } from '@joeblew999/remy-ui/locale';

/**
 * Better Auth's client for the browser, as its TanStack Start guide recommends for signing in and
 * out: it calls this origin's /api/auth (src/routes/api.auth.$.ts), where Better Auth's own origin
 * check and rate limits apply. Each request says which language the page is in, as the API client
 * does, so the sign-in code's email is written in it.
 */
export const authClient = createAuthClient({
  plugins: [emailOTPClient()],
  fetchOptions: { onRequest: context => { context.headers.set('accept-language', getLocale()); } },
});
