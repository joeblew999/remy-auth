import type { BetterAuthOptions } from 'better-auth';
import { emailOTP } from 'better-auth/plugins/email-otp';
import { tanstackStartCookies } from 'better-auth/tanstack-start';

/** One sign-in code to deliver. */
export type CodeMail = { email: string; otp: string; type: string };

/** What the options need from where they run: the Worker (auth.server.ts) or the CLI (cli.ts). */
export type AuthDeps = {
  /** The D1 binding in the Worker; a throwaway SQLite database for the CLI. */
  database: BetterAuthOptions['database'];
  secret: string | undefined;
  /** This deployment's origin: the issuer, and the only origin Better Auth trusts. */
  baseURL: string;
  /** Delivers a code, or throws: a failed delivery is an error to the person, never a fallback code. */
  sendCode: (mail: CodeMail) => Promise<void>;
};

/**
 * The fields beyond Better Auth's own that a person may write on their own account through its
 * endpoints (`/api/auth/update-user`, sign-up), by table, each with the sentence that says why it is
 * theirs to change. Better Auth accepts every `additionalFields` entry and plugin field in those
 * bodies unless it is declared `input: false`; in remy-sport an account approved itself that way.
 * `writableFieldProblems` (./fields.ts) fails the checks on a writable field not listed here. None yet.
 */
export const personMayEdit: Record<string, Record<string, string>> = {};

/**
 * Better Auth's options for remy-auth, in one place for the Worker and the CLI (.plans/auth-service.md,
 * decisions 1, 3 and 5). No Workers imports, so `auth generate` and the checks load it in Node.
 */
export function authOptions({ database, secret, baseURL, sendCode }: AuthDeps) {
  return {
    appName: 'Remy',
    baseURL,
    secret,
    database,
    // Decision 1: sign in with a one-time code by email; no passwords are stored.
    emailAndPassword: { enabled: false },
    // Decision 5: a week, refreshed daily; no cookie cache, which would keep a revoked session alive.
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24, cookieCache: { enabled: false } },
    // Limits are kept in D1: Workers run many instances, and memory limits are per instance.
    rateLimit: { enabled: true, storage: 'database' },
    // Cloudflare sets CF-Connecting-IP itself; no other header is believed.
    advanced: { ipAddress: { ipAddressHeaders: ['cf-connecting-ip'] } },
    plugins: [
      // Better Auth's defaults otherwise: 6 digits, 300 seconds, 3 attempts. Sign-up is open, and a
      // new account holds nothing.
      emailOTP({ storeOTP: 'hashed', sendVerificationOTP: sendCode }),
      // Last, as Better Auth requires: forwards cookies set by server-side auth.api calls to Start's response.
      tanstackStartCookies(),
    ],
  } satisfies BetterAuthOptions;
}
