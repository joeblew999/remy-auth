import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { codeMail } from '../src/auth/code-mail';
import { product } from '../src/product';

// The product's name is the app's to give (docs/content/dev/gui.md, "The product's name"): Remy is
// this prototype's, and a project built on the same code has its own. Nothing in the shared packages
// may say it for them. What the pages show is the shared productNameChecks' (every app runs it; the
// consumer fixture, called "My app", is where it bites); these are the two things no page shows.

test("no message in the platform's catalog names a product: a message that says the name takes it as {product}", () => {
  const catalog: Record<string, unknown> = JSON.parse(readFileSync('packages/ui/messages/en.json', 'utf8'));
  const naming = Object.entries(catalog).filter(([, message]) => /\bRemy\b/.test(JSON.stringify(message))).map(([key]) => key);
  expect(naming).toEqual([]);
});

test('the sign-in email is in the name of whichever product sends it', () => {
  const mail = codeMail({ otp: '123456', product: 'Harbor' }, 'en');
  expect(mail.subject).toContain('Harbor');
  expect(mail.text).toContain('Harbor');
  expect(mail.html).toContain('Harbor');
  for (const part of [mail.subject, mail.text, mail.html!]) expect(part).not.toContain(product);
});
