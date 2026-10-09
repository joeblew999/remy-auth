import { test, expect, type APIRequestContext } from '@playwright/test';
import { collectErrors, localizedPath } from '@joeblew999/remy-ui/checks';
import { m } from '@joeblew999/remy-ui/messages';
import { procedures, routeOf } from '@joeblew999/remy-ui/api/coverage';
import { policyOf } from '@joeblew999/remy-ui/api/guard-core';
import { router } from '../src/api/router';
import { permits } from '../src/auth/environment';
import { writableFieldProblems } from '../src/auth/fields';
import { authOptions, personMayEdit } from '../src/auth/options';
import { latestCode, local, newEmail, sendCode, signIn, visitor, visitorAddress } from './people';

// Signing in (.plans/auth-service.md), on the real Worker with Better Auth and the local D1: nothing is
// mocked. The code is the one Better Auth made; the local environment writes it to its local_mail table
// instead of mailing it (src/auth/mail.server.ts), and these checks read it back from the Worker itself
// (/dev/mail, src/routes/dev.mail.ts; tests/people.ts). Only the local environment captures mail, so
// the sign-in checks run against the local target only; against a deployment, that route must not exist.
const accountPath = localizedPath('/app/account', 'en');

test('a person signs in with an emailed code, and the session reaches the API over HTTP and the account page through the server\'s own client', async ({ playwright, baseURL }) => {
  test.skip(!local, 'reads the code from the local mail capture');
  const person = await visitor(playwright, baseURL);
  const stranger = await visitor(playwright, baseURL);
  const email = newEmail();
  const shown = async (who: APIRequestContext) => {
    const response = await who.get(accountPath);
    expect(response.status()).toBe(200);
    expect(response.headers()['cache-control']).toBe('no-store');
    return response.text();
  };

  // Nobody is signed in: the API refuses, and the page the server renders offers the sign-in form.
  expect((await person.get('/api/me')).status()).toBe(401);
  expect(await shown(person)).toContain('data-sign-in="address"');

  // The code is Better Auth's own: six digits, made for this address.
  expect((await sendCode(person, email)).status()).toBe(200);
  const code = await latestCode(person, email);
  expect(code).toMatch(/^\d{6}$/);
  expect(await latestCode(person, newEmail())).toBeUndefined();

  // A wrong code signs nobody in.
  const wrong = await signIn(person, email, code === '000000' ? '111111' : '000000');
  expect(wrong.status()).toBe(400);
  expect(wrong.headers()['set-cookie']).toBeUndefined();
  expect((await person.get('/api/me')).status()).toBe(401);

  // The right code does: a session cookie scripts cannot read, never sent across sites by a form.
  const signedIn = await signIn(person, email, code);
  expect(signedIn.status()).toBe(200);
  const cookie = signedIn.headers()['set-cookie'];
  expect(cookie).toMatch(/session_token=/);
  expect(cookie).toMatch(/; HttpOnly/i);
  expect(cookie).toMatch(/; SameSite=Lax/i);
  expect(cookie).toMatch(/; Path=\//i);

  // Over HTTP: the contract's GET /api/me answers the person's own account, and nothing else.
  const me = await person.get('/api/me');
  expect(me.status()).toBe(200);
  expect(me.headers()['cache-control']).toBe('no-store');
  const account = await me.json();
  expect(account).toEqual({ id: expect.any(String), name: '', email, emailVerified: true });

  // Through the server's own client: the account page's loader calls the router in process, with
  // the page's cookies, and the HTML names who is signed in.
  const page = await shown(person);
  expect(page).toContain('data-account="signed-in"');
  expect(page).toContain(email);
  expect(page).not.toContain('data-sign-in=');

  // A code works once.
  const replay = await signIn(stranger, email, code);
  expect(replay.status()).toBe(400);

  // Somebody else is still nobody, and nothing a stranger can read names the person who just signed in.
  expect((await stranger.get('/api/me')).status()).toBe(401);
  expect(await shown(stranger)).not.toContain(email);
  const open = procedures(router).filter(({ procedure }) => policyOf(procedure) === 'public').map(({ procedure }) => routeOf(procedure)).filter(route => route.method === 'GET' && !route.path!.includes('{'));
  expect(open.length).toBeGreaterThan(0);
  for (const route of open) {
    const body = await (await stranger.get(route.path!)).text();
    for (const value of [email, account.id]) expect(body, `GET ${route.path} names the signed-in person`).not.toContain(value);
  }

  // Signing out ends the session on the server: the same cookie is nobody again, at once.
  const out = await person.post('/api/auth/sign-out', { data: {} });
  expect(out.status()).toBe(200);
  const old = await visitor(playwright, baseURL);
  expect((await old.get('/api/me', { headers: { Cookie: cookie.split(';')[0] } })).status()).toBe(401);
  expect(await shown(person)).toContain('data-sign-in="address"');
  await Promise.all([person, stranger, old].map(context => context.dispose()));
});

test.describe('in the browser', () => {
  test.use({ extraHTTPHeaders: { 'CF-Connecting-IP': visitorAddress() } });

  test('the account page signs a person in with the code, keeps them signed in on reload, and signs them out', async ({ page }) => {
    test.skip(!local, 'reads the code from the local mail capture');
    const errors = collectErrors(page);
    const email = newEmail();
    const o = { locale: 'en' } as const;
    await page.goto(accountPath);
    await page.waitForLoadState('networkidle');

    // An address that is not one is the form's own error; nothing is sent.
    await page.getByLabel(m.account_email_label({}, o)).fill('not an address');
    await page.getByRole('button', { name: m.account_send_code({}, o) }).click();
    await expect(page.locator('#sign-in-email-error')).toHaveText(m.account_email_invalid({}, o));

    await page.getByLabel(m.account_email_label({}, o)).fill(email);
    await page.getByRole('button', { name: m.account_send_code({}, o) }).click();
    await expect(page.locator('#sign-in-code-hint')).toHaveText(m.account_code_sent({ email }, o));
    const code = await latestCode(page.request, email);

    // A wrong code says so and signs nobody in.
    await page.getByLabel(m.account_code_label({}, o)).fill(code === '000000' ? '111111' : '000000');
    await page.getByRole('button', { name: m.account_verify({}, o) }).click();
    await expect(page.getByRole('alert')).toHaveText(m.account_code_wrong({}, o));

    await page.getByLabel(m.account_code_label({}, o)).fill(code);
    await page.getByRole('button', { name: m.account_verify({}, o) }).click();
    await expect(page.locator('[data-account="email"]')).toHaveText(email);
    await expect(page.locator('[data-account="name"]')).toHaveText(m.account_no_name({}, o));

    // The server renders the same on a fresh load.
    await page.reload();
    await expect(page.locator('[data-account="email"]')).toHaveText(email);

    await page.getByRole('button', { name: m.account_sign_out({}, o) }).click();
    await expect(page.getByLabel(m.account_email_label({}, o))).toBeVisible();
    await page.reload();
    await expect(page.getByLabel(m.account_email_label({}, o))).toBeVisible();
    // The refused sign-in is the one failed request the page made (Better Auth's 400).
    expect(errors.filter(error => !/400/.test(error))).toEqual([]);
  });
});

test('a fourth code request from one address within a minute is refused, and another address is not', async ({ playwright, baseURL }) => {
  test.skip(!local, 'names its own address, which only a local Worker believes');
  const one = await visitor(playwright, baseURL);
  const other = await visitor(playwright, baseURL);
  const email = newEmail();
  for (let request = 1; request <= 3; request++) expect((await sendCode(one, email)).status(), `request ${request}`).toBe(200);
  const refused = await sendCode(one, email);
  expect(refused.status()).toBe(429);
  expect(Number(refused.headers()['x-retry-after'])).toBeGreaterThan(0);
  expect((await sendCode(other, email)).status()).toBe(200);
  await Promise.all([one, other].map(context => context.dispose()));
});

test('a person can write no field on their account that nobody decided is theirs to change', () => {
  const options = authOptions({ database: undefined, secret: 'check', baseURL: 'http://localhost', sendCode: async () => {} });
  expect(writableFieldProblems(options, personMayEdit)).toEqual([]);
  // The rule itself catches remy-sport's case, so an empty list above means something: an additional
  // field without `input: false` is named, one with it is not, and a listed one needs its reason to be true.
  const lifecycle = { ...options, user: { additionalFields: {
    statusCode: { type: 'string', required: false },
    bizId: { type: 'string', required: false, input: false },
    localeCode: { type: 'string', required: false },
  } } } as const;
  expect(writableFieldProblems(lifecycle, { user: { localeCode: 'their own language', bizId: 'stale' } })).toEqual([
    'user.statusCode: a person can write it through Better Auth\'s endpoints; declare it input: false, or say in personMayEdit why it is theirs to change',
    'user.bizId: listed in personMayEdit, but it is not a writable additional field',
  ]);
});

test('only the local environment has a convenience; anything unknown is production, where the mail capture does not exist', async ({ request }) => {
  expect(permits('local', 'captureMail')).toBe(true);
  for (const environment of ['production', undefined, '', 'staging', 'Local', 'constructor', '__proto__']) expect(permits(environment, 'captureMail'), String(environment)).toBe(false);
  // The route that reads the capture back: there locally, a 404 on a deployment.
  expect((await request.get('/dev/mail?recipient=nobody@example.test')).status()).toBe(local ? 200 : 404);
  // Where no code can be delivered, the account page offers no form: it keeps its empty state.
  const account = await (await request.get(accountPath)).text();
  expect(account.includes('data-sign-in="address"'), 'the sign-in form').toBe(local);
  expect(account.includes(m.account_empty_title({}, { locale: 'en' })), 'the empty state').toBe(!local);
});
