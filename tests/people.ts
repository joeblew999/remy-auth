import { expect, type APIRequestContext } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';

// People for the checks that need somebody signed in, on the local Worker: each is a visitor of their
// own who signs in with a real code, which the local environment captured instead of mailing
// (src/auth/mail.server.ts) and the Worker reads back (/dev/mail). Nothing is mocked and no session
// is made outside Better Auth. Only a local Worker captures mail, so these run against the local target.

/** Whether the checks run against the local Worker (TEST_TARGET is "remote" against a deployment). */
export const local = process.env.TEST_TARGET !== 'remote';

type Playwright = { request: { newContext: (options: object) => Promise<APIRequestContext> } };

/** An address nobody else in this run uses. */
export const newEmail = (name = 'check') => `${name}-${randomUUID()}@example.test`;

/**
 * An address of the visitor's own. Better Auth limits sign-in attempts per address (three a minute),
 * read from CF-Connecting-IP, which Cloudflare sets itself on a deployment. Locally nothing sets it,
 * so each visitor here names one (2001:db8::/32, reserved for documentation) and the limits stay per
 * visitor, as they are for real ones, instead of every check sharing 127.0.0.1's.
 */
export const visitorAddress = () => `2001:db8:${randomBytes(2).toString('hex')}:${randomBytes(2).toString('hex')}::1`;

/** A visitor with their own cookies and address: nobody is signed in yet. */
export const visitor = (playwright: Playwright, baseURL: string | undefined, address = visitorAddress()) =>
  playwright.request.newContext({ baseURL, extraHTTPHeaders: { 'CF-Connecting-IP': address, Origin: baseURL! } });

export const sendCode = (who: APIRequestContext, email: string) => who.post('/api/auth/email-otp/send-verification-otp', { data: { email, type: 'sign-in' } });
export const signIn = (who: APIRequestContext, email: string, otp: string) => who.post('/api/auth/sign-in/email-otp', { data: { email, otp } });

/** The newest code the local environment captured for `email`. */
export async function latestCode(who: APIRequestContext, email: string): Promise<string> {
  const response = await who.get(`/dev/mail?recipient=${encodeURIComponent(email)}`);
  expect(response.status()).toBe(200);
  return (await response.json()).mail[0]?.code;
}

/** A visitor signed in as `email` (a new account the first time), through Better Auth's own endpoints. */
export async function signedIn(playwright: Playwright, baseURL: string | undefined, email = newEmail()) {
  const who = await visitor(playwright, baseURL);
  expect((await sendCode(who, email)).status()).toBe(200);
  expect((await signIn(who, email, await latestCode(who, email))).status()).toBe(200);
  return Object.assign(who, { email });
}
