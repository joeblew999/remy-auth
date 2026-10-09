import { createAuthClient } from 'better-auth/react';
import { emailOTPClient } from 'better-auth/client/plugins';

/**
 * Better Auth's client for the browser, as its TanStack Start guide recommends for signing in and
 * out: it calls this origin's /api/auth (src/routes/api.auth.$.ts), where Better Auth's own origin
 * check and rate limits apply.
 */
export const authClient = createAuthClient({ plugins: [emailOTPClient()] });
