import { environments } from '@joeblew999/remy-ui/environment';
import { seededPerson } from './seed';

/**
 * What each environment permits: the one policy table (docs/content/dev/development.md), in
 * remy-sport's shape. The Worker's `ENVIRONMENT` is "production" in wrangler.jsonc and "staging" in
 * its staging environment; a local `.dev.vars` (`mise run auth:local`) says "local"; anything absent
 * or unknown is production. Every convenience is listed in .plans/auth-service.md.
 *
 * Signing in works two ways, and an environment has either both or one. The normal way is
 * everywhere: an address, then the code mailed to it. The automatic way is local and staging only:
 * the seeded people, one press each, with a published code and no inbox.
 */
export const { environmentOf, policyFor, permits } = environments({
  production: {
    /** Mail is sent, through Cloudflare Email Service. */
    capturesMail: false,
    /** No seeded people, and no picker. */
    seededSignIn: false,
    /** Every sign-in code is Better Auth's own random one. */
    signInCode: 'none',
    offersAdminSignIn: false,
  },
  staging: {
    /** Mail is sent for real: whether a code arrives is the question a local run cannot answer. */
    capturesMail: false,
    /** The seeded people exist and the sign-in form offers them: signing in without an inbox is most of what staging is for. */
    seededSignIn: true,
    /** They sign in with the published code; every other address gets a random code by mail, as in production. */
    signInCode: 'derived',
    /** Staging is a deployment, and a deployment never publishes a way in as the administrator. */
    offersAdminSignIn: false,
  },
  local: {
    /** Mail is kept in the Worker's outbox instead of sent; /dev/mail reads it back. */
    capturesMail: true,
    /** The seeded people exist (src/auth/seed.ts), and the sign-in form offers them (/dev/people). */
    seededSignIn: true,
    /**
     * A seeded person signs in with the published code below. Only they do: any other address gets a
     * random code, so no account is ever made with a known one.
     */
    signInCode: 'derived',
    /** The seeded administrator is offered too. A deployment would never publish a way in as one. */
    offersAdminSignIn: true,
  },
});

/**
 * The fixed sign-in code where the environment derives one. Not a secret: it is published by
 * construction (/dev/people sends it to the page), and it only ever applies to seeded `.test`
 * addresses that no mail can reach. What keeps it safe is scope, not obscurity. The same code as
 * remy-sport's, so one habit serves every Remy app.
 */
export const DEMO_SIGN_IN_CODE = '424242';

/** The fixed sign-in code for seeded people here, or undefined where every code is random. */
export const fixedSignInCode = (env: { ENVIRONMENT?: string }): string | undefined => (permits(env, 'signInCode') === 'derived' ? DEMO_SIGN_IN_CODE : undefined);

/**
 * The code `email` signs in with when this environment publishes one for them, or undefined for a
 * random code. Only a seeded person gets it, so no account is ever made with a known code; and the
 * seeded administrator only where the environment offers that account at all.
 */
export function publishedCodeFor(env: { ENVIRONMENT?: string }, email: string): string | undefined {
  const person = seededPerson(email);
  if (!person || (person.role === 'admin' && !permits(env, 'offersAdminSignIn'))) return undefined;
  return fixedSignInCode(env);
}
