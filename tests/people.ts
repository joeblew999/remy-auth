import { expect, type APIRequestContext } from '@playwright/test';
import { randomBytes, randomUUID } from 'node:crypto';
import { policyFor } from '../src/auth/environment';

// People for the checks that need somebody signed in, on the local Worker: each is a visitor of their
// own who signs in for real. A new person gets Better Auth's own random code, which the local
// environment keeps in its outbox instead of mailing (src/auth/mail.server.ts) and the Worker reads
// back (/dev/mail). A seeded person (src/auth/seed.ts) signs in with the code the environment
// publishes for them (/dev/people). Nothing is mocked and no session is made outside Better Auth.
// Only a local Worker captures mail, so a check that needs a new person runs against the local target;
// staging offers the seeded people too, so a check that needs only them runs there as well. Each
// check asks the Worker what it permits (`permitted`) instead of guessing it from the target.

/** Whether the checks run against the local Worker (TEST_TARGET is "remote" against a deployment). */
export const local = process.env.TEST_TARGET !== 'remote';

/**
 * What the Worker under test permits: it says which environment it is (/healthz), and the app's table
 * says what that means. So a check asks what should be there instead of guessing it from the target:
 * staging is a deployment with seeded people, production a deployment with none.
 */
export async function permitted(who: APIRequestContext) {
  const { environment }: { environment: string } = await (await who.get('/healthz')).json();
  return { environment, ...policyFor({ ENVIRONMENT: environment }) };
}

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

/**
 * The header that gives a visitor an address of their own, on a local Worker only. A deployment is
 * behind Cloudflare, which sets the header itself and refuses a request that arrives with one.
 */
export const ownAddress = (address = visitorAddress()): Record<string, string> => (local ? { 'CF-Connecting-IP': address } : {});

/** A visitor with their own cookies and (locally) address: nobody is signed in yet. */
export const visitor = (playwright: Playwright, baseURL: string | undefined, address = visitorAddress()) =>
  playwright.request.newContext({ baseURL, extraHTTPHeaders: { ...ownAddress(address), Origin: baseURL! } });

export const sendCode = (who: APIRequestContext, email: string) => who.post('/api/auth/email-otp/send-verification-otp', { data: { email, type: 'sign-in' } });
export const signIn = (who: APIRequestContext, email: string, otp: string) => who.post('/api/auth/sign-in/email-otp', { data: { email, otp } });

/** A mail the local environment kept instead of sending. */
export type CapturedMail = { to: string; from: string; subject: string; text: string; html?: string; createdAt: string };

/** The mail captured for `email`, newest first. */
export async function capturedMail(who: APIRequestContext, email: string): Promise<CapturedMail[]> {
  const response = await who.get(`/dev/mail?recipient=${encodeURIComponent(email)}`);
  expect(response.status()).toBe(200);
  return (await response.json()).mail;
}

/** The code in the newest mail captured for `email`, as a person would read it there. */
export async function latestCode(who: APIRequestContext, email: string): Promise<string | undefined> {
  return (await capturedMail(who, email))[0]?.text.match(/\b\d{6}\b/)?.[0];
}

/** The seeded sign-in this environment offers: its people, what each holds, and their published code. */
export async function seededSignIn(who: APIRequestContext) {
  const response = await who.get('/dev/people');
  expect(response.status()).toBe(200);
  return await response.json() as { code: string; people: { name: string; email: string; role: string; holds: string[] }[] };
}

/** A visitor signed in as `email` (a new account the first time), through Better Auth's own endpoints. */
export async function signedIn(playwright: Playwright, baseURL: string | undefined, email = newEmail()) {
  const who = await visitor(playwright, baseURL);
  expect((await sendCode(who, email)).status()).toBe(200);
  expect((await signIn(who, email, (await latestCode(who, email))!)).status()).toBe(200);
  return Object.assign(who, { email });
}

/** A visitor signed in as a seeded person, with the code the environment publishes for them. Read-only use: others sign in as them too. */
export async function signedInAsSeeded(playwright: Playwright, baseURL: string | undefined, email: string) {
  const who = await visitor(playwright, baseURL);
  const { code } = await seededSignIn(who);
  expect((await sendCode(who, email)).status()).toBe(200);
  expect((await signIn(who, email, code)).status()).toBe(200);
  return Object.assign(who, { email });
}
