import { test, expect, type APIRequestContext } from '@playwright/test';
import { collectErrors, localizedPath } from '@joeblew999/remy-ui/checks';
import { m } from '@joeblew999/remy-ui/messages';
import { procedures, routeOf } from '@joeblew999/remy-ui/api/coverage';
import { policyOf } from '@joeblew999/remy-ui/api/guard-core';
import { router } from '../src/api/router';
import { environments } from '@joeblew999/remy-ui/environment';
import { clearOutbox, mailerFor, readOutbox, unreachable } from '@joeblew999/remy-ui/mail';
import { DEMO_SIGN_IN_CODE, environmentOf, fixedSignInCode, policyFor, publishedCodeFor } from '../src/auth/environment';
import { seededPeople } from '../src/auth/seed';
import { product } from '../src/product';
import { writableFieldProblems } from '../src/auth/fields';
import { authOptions, personMayEdit } from '../src/auth/options';
import { capturedMail, latestCode, local, newEmail, ownAddress, permitted, seededSignIn, sendCode, signIn, signedInAsSeeded, visitor } from './people';

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
  const code = (await latestCode(person, email))!;
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
  test.use({ extraHTTPHeaders: ownAddress() });

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
    const code = (await latestCode(page.request, email))!;

    // A wrong code says so and signs nobody in. (The exact name: each seeded person's button starts with it.)
    await page.getByLabel(m.account_code_label({}, o)).fill(code === '000000' ? '111111' : '000000');
    await page.getByRole('button', { name: m.account_verify({}, o), exact: true }).click();
    await expect(page.getByRole('alert')).toHaveText(m.account_code_wrong({}, o));

    await page.getByLabel(m.account_code_label({}, o)).fill(code);
    await page.getByRole('button', { name: m.account_verify({}, o), exact: true }).click();
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

test.describe('the seeded people, in the browser', () => {
  test.use({ extraHTTPHeaders: ownAddress() });

  test('the sign-in form offers the seeded people with what they hold, and one press signs in as one of them', async ({ page }) => {
    const here = await permitted(page.request);
    test.skip(!here.seededSignIn, `${here.environment} offers no seeded people`);
    const errors = collectErrors(page);
    const o = { locale: 'en' } as const;
    await page.goto(accountPath);
    await page.waitForLoadState('networkidle');
    const people = page.locator('[data-seeded-people]');
    await expect(people).toContainText(m.account_people_intro({ code: DEMO_SIGN_IN_CODE }, o));
    await expect(people.locator('[data-person]')).toHaveCount(seededPeople.filter(person => person.role !== 'admin' || here.offersAdminSignIn).length);
    const cleo = people.locator('[data-person="cleo@remy.test"]');
    await expect(cleo.locator('[data-person-holds]')).toContainText('NOTE_EDITOR note_squad');
    await expect(people.locator('[data-person="eli@remy.test"] [data-person-holds]')).toHaveText(m.account_people_holds_nothing({}, o));
    await cleo.getByRole('button', { name: m.account_people_sign_in({ name: 'Cleo Tanaka' }, o) }).click();
    await expect(page.locator('[data-account="email"]')).toHaveText('cleo@remy.test');
    await expect(page.locator('[data-account="name"]')).toHaveText('Cleo Tanaka');
    expect(errors).toEqual([]);
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

test('the Worker under test has exactly what the table gives its environment, and nothing else', async ({ request }) => {
  // On the Worker under test, which says what it is (/healthz): exactly what the table gives that
  // environment exists, and nothing else. A local run is never mistaken for a deployment, or the reverse.
  const here = await permitted(request);
  expect(local ? ['local'] : ['staging', 'production']).toContain(here.environment);
  expect((await request.get('/dev/mail?recipient=nobody@example.test')).status()).toBe(here.capturesMail ? 200 : 404);
  const people = await request.get('/dev/people');
  expect(people.status()).toBe(here.seededSignIn ? 200 : 404);
  if (here.seededSignIn) {
    const offered: { email: string; role: string }[] = (await people.json()).people;
    expect(offered.map(person => person.email)).toEqual(seededPeople.filter(person => person.role !== 'admin' || here.offersAdminSignIn).map(person => person.email));
    expect(offered.some(person => person.role === 'admin'), 'the administrator is offered').toBe(here.offersAdminSignIn);
  }
  // The normal way in is everywhere a code can be delivered: captured locally, mailed on a deployment.
  const account = await (await request.get(accountPath)).text();
  expect(account.includes('data-sign-in="address"'), 'the sign-in form').toBe(true);
  expect(account.includes('data-seeded-people'), 'the seeded people').toBe(here.seededSignIn);
});

test('the sign-in code is one email: the code and nothing to click, written for the reader, from the configured sender', async ({ playwright, baseURL }) => {
  test.skip(!local, 'reads the local outbox');
  const reader = await visitor(playwright, baseURL);
  const email = newEmail('reader');
  expect((await reader.post('/api/auth/email-otp/send-verification-otp', { data: { email, type: 'sign-in' }, headers: { 'Accept-Language': 'ar' } })).status()).toBe(200);
  const [mail, ...earlier] = await capturedMail(reader, email);
  expect(earlier).toEqual([]);
  const code = mail.text.match(/\b\d{6}\b/)![0];
  expect(mail).toMatchObject({ to: email, from: 'noreply@mail.ubuntusoftware.net', subject: m.email_code_subject({ code, product }, { locale: 'ar' }) });
  // Plain text and HTML say the same; the HTML is in the reader's language and direction, and the code reads left to right.
  for (const line of [m.email_code_intro({ product }, { locale: 'ar' }), m.email_code_expiry({}, { locale: 'ar' }), m.email_code_ignore({}, { locale: 'ar' })]) expect(mail.text).toContain(line);
  expect(mail.html).toContain('<html lang="ar" dir="rtl">');
  expect(mail.html).toContain(`<h1 dir="ltr"`);
  expect(mail.html).toContain(`>${code}</h1>`);
  // A code somebody retypes cannot be forwarded as a way in: no link, in either part.
  expect(mail.html).not.toMatch(/<a\b|https?:/);
  expect(mail.text).not.toMatch(/https?:/);
  await reader.dispose();
});

test('the seeded people sign in with the published code, each with their role and what they hold; nobody else can use that code', async ({ playwright, baseURL }) => {
  test.skip(!local, 'only the local environment offers seeded people');
  const asker = await visitor(playwright, baseURL);
  const seeded = await seededSignIn(asker);
  // The people are the seed's, the administrator among them locally, and what each holds is read from the notes demo's data.
  expect(seeded.code).toBe(DEMO_SIGN_IN_CODE);
  expect(seeded.people.map(({ name, email, role }) => ({ name, email, role }))).toEqual(seededPeople.map(({ name, email, role }) => ({ name, email, role })));
  const holds = Object.fromEntries(seeded.people.map(person => [person.email, person.holds]));
  expect(holds['ben@remy.test']).toContain('NOTE_AUTHOR note_squad');
  expect(holds['cleo@remy.test']).toEqual(expect.arrayContaining(['NOTE_AUTHOR note_camp', 'NOTE_EDITOR note_squad']));
  expect(holds['dev@remy.test']).toContain('NOTE_READER note_squad');
  expect(holds['eli@remy.test']).toEqual([]);

  // Each signs in for real with that code, and is who the seed says, role included.
  for (const person of seededPeople) {
    const who = await signedInAsSeeded(playwright, baseURL, person.email);
    const session = await (await who.get('/api/auth/get-session')).json();
    expect(session.user, person.email).toMatchObject({ id: person.id, name: person.name, email: person.email, emailVerified: true, role: person.role });
    expect(await (await who.get('/api/me')).json()).toEqual({ id: person.id, name: person.name, email: person.email, emailVerified: true });
    await who.dispose();
  }

  // The published code is a seeded person's only: for any other address the code is random, so no account is made with a known one.
  const other = await visitor(playwright, baseURL);
  const email = newEmail('not-seeded');
  expect((await sendCode(other, email)).status()).toBe(200);
  expect(await latestCode(other, email)).not.toBe(seeded.code);
  expect((await signIn(other, email, seeded.code)).status()).toBe(400);
  expect((await other.get('/api/me')).status()).toBe(401);
  // And a new account is an ordinary person: nobody can give themselves a role.
  expect((await signIn(other, email, (await latestCode(other, email))!)).status()).toBe(200);
  expect((await other.post('/api/auth/update-user', { data: { role: 'admin' } })).status()).not.toBe(200);
  expect((await (await other.get('/api/auth/get-session')).json()).user.role).toBe('user');
  await Promise.all([asker, other].map(context => context.dispose()));
});
