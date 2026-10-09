import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { codeMail } from '../../src/auth/code-mail';
import { product } from '../../src/product';

// The product's name where no page shows it: the catalog and the sign-in email. Plain functions, so
// they run without a build (mise run project:test:unit). What the pages show is productNameChecks'.

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
