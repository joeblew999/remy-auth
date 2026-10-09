import { test, expect } from '@playwright/test';
import { environments } from '@joeblew999/remy-ui/environment';
import { clearOutbox, mailerFor, readOutbox, unreachable } from '@joeblew999/remy-ui/mail';
import { DEMO_SIGN_IN_CODE, environmentOf, fixedSignInCode, policyFor, publishedCodeFor } from '../../src/auth/environment';
import { writableFieldProblems } from '../../src/auth/fields';
import { authOptions, personMayEdit } from '../../src/auth/options';
import { seededPeople } from '../../src/auth/seed';

// Sign-in's rules that are plain functions: the environment table, who gets the published code, the
// mailer, which account fields a person may write. No Worker, no build, no browser: they run in a
// second or two (mise run project:test:unit), so they run on every check. What needs the Worker is
// in tests/auth.spec.ts.

test('one table says what each environment permits; anything undeclared is production, where no convenience exists', () => {
  expect(policyFor({ ENVIRONMENT: 'local' })).toEqual({ capturesMail: true, seededSignIn: true, signInCode: 'derived', offersAdminSignIn: true });
  // Staging: the automatic sign-in beside the normal one, with real mail, and no administrator on offer.
  expect(policyFor({ ENVIRONMENT: 'staging' })).toEqual({ capturesMail: false, seededSignIn: true, signInCode: 'derived', offersAdminSignIn: false });
  const production = { capturesMail: false, seededSignIn: false, signInCode: 'none', offersAdminSignIn: false };
  for (const environment of ['production', undefined, '', 'preview', 'Staging', 'Local', 'constructor', '__proto__']) {
    expect(policyFor({ ENVIRONMENT: environment }), String(environment)).toEqual(production);
    expect(fixedSignInCode({ ENVIRONMENT: environment }), String(environment)).toBeUndefined();
  }
  expect(environmentOf({ ENVIRONMENT: 'local' })).toBe('local');
  expect(environmentOf({ ENVIRONMENT: 'staging' })).toBe('staging');
  expect(environmentOf({})).toBe('production');
  expect(fixedSignInCode({ ENVIRONMENT: 'local' })).toBe(DEMO_SIGN_IN_CODE);
  expect(fixedSignInCode({ ENVIRONMENT: 'staging' })).toBe(DEMO_SIGN_IN_CODE);
  // The shared table itself refuses to be built without a production column to fall back to.
  expect(() => environments({ local: { capturesMail: true } } as never)).toThrow(/production/);
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

test('mail leaves through Cloudflare\'s binding from the configured sender, is captured instead where the table says so, and a failure says who it was for', async () => {
  const sent: unknown[] = [];
  const message = { to: 'ada@inbox.remy-checks.dev', subject: 'Hello', text: 'Plain', html: '<p>Plain</p>' };
  await mailerFor({ capture: false, from: 'noreply@mail.example', binding: { send: async mail => { sent.push(mail); } } }).send(message);
  expect(sent).toEqual([{ ...message, from: 'noreply@mail.example' }]);
  // Captured: nothing reaches the binding, and the outbox holds what would have gone on the wire.
  clearOutbox();
  await mailerFor({ capture: true, from: 'noreply@mail.example', binding: { send: async () => { throw new Error('must not send'); } } }).send(message);
  expect(readOutbox('ADA@inbox.remy-checks.dev')).toEqual([{ ...message, from: 'noreply@mail.example', id: expect.any(String), createdAt: expect.any(String) }]);
  expect(readOutbox('someone-else@example.test')).toEqual([]);
  // Not configured, or refused: an error naming the reader, never a silent drop.
  await expect(mailerFor({ capture: false, from: 'noreply@mail.example' }).send(message)).rejects.toThrow('mail: not configured (no send_email binding); nothing was sent to ada@inbox.remy-checks.dev');
  await expect(mailerFor({ capture: false, binding: { send: async () => {} } }).send(message)).rejects.toThrow('no sender address');
  const refuse = Object.assign(new Error('destination address is not verified'), { code: 'E_RECIPIENT' });
  await expect(mailerFor({ capture: false, from: 'noreply@mail.example', binding: { send: async () => { throw refuse; } } }).send(message))
    .rejects.toThrow('mail: noreply@mail.example to ada@inbox.remy-checks.dev was refused (E_RECIPIENT): destination address is not verified');
});

test('no mail is sent to an address no mail can reach: a seeded person\'s, or any other on a reserved domain', async () => {
  for (const address of [...seededPeople.map(person => person.email), 'check@example.test', 'a@b.example', 'x@example.com', 'x@mail.example.org', 'x@nowhere.invalid', 'x@localhost', 'X@REMY.TEST'])
    expect(unreachable(address), address).toBe(true);
  for (const address of ['someone@gmail.com', 'a@testing.dev', 'a@example.dev', 'noreply@mail.ubuntusoftware.net', 'a@contest.io'])
    expect(unreachable(address), address).toBe(false);
  // Where mail is sent (staging, production), the binding never sees such a message, and that is no error.
  const sent: unknown[] = [];
  const mailer = mailerFor({ capture: false, from: 'noreply@mail.example', binding: { send: async mail => { sent.push(mail); } } });
  await mailer.send({ to: 'ben@remy.test', subject: 'Your code', text: '424242' });
  expect(sent).toEqual([]);
  // Where mail is captured (local), it is still kept, so a check can read what would have been said.
  clearOutbox();
  await mailerFor({ capture: true, from: 'noreply@mail.example' }).send({ to: 'ben@remy.test', subject: 'Your code', text: '424242' });
  expect(readOutbox('ben@remy.test')).toHaveLength(1);
});

test('the published code is a seeded person\'s only, where the environment has one, and never the administrator\'s on a deployment', async () => {
  const [admin, ...others] = seededPeople;
  expect(admin.role).toBe('admin');
  for (const person of seededPeople) {
    expect(publishedCodeFor({ ENVIRONMENT: 'local' }, person.email), person.email).toBe(DEMO_SIGN_IN_CODE);
    expect(publishedCodeFor({ ENVIRONMENT: 'production' }, person.email), person.email).toBeUndefined();
    expect(publishedCodeFor({}, person.email), person.email).toBeUndefined();
  }
  // Staging is automatic for the seeded people and is still a deployment: no published way in as the administrator.
  for (const person of others) expect(publishedCodeFor({ ENVIRONMENT: 'staging' }, person.email), person.email).toBe(DEMO_SIGN_IN_CODE);
  expect(publishedCodeFor({ ENVIRONMENT: 'staging' }, admin.email)).toBeUndefined();
  // Anybody else gets a random code everywhere, so no account is ever made with a known one.
  for (const environment of ['local', 'staging', 'production']) expect(publishedCodeFor({ ENVIRONMENT: environment }, 'someone@gmail.com'), environment).toBeUndefined();
});
