import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { localizedPath } from '@joeblew999/remy-ui/checks';
import { codeMail } from '../src/auth/code-mail';
import { deployments } from '../src/deployments';
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

test("the Settings page lists the app's other deployments, each answering for itself, and never the one the page came from", async ({ page, baseURL }) => {
  // What each would answer, so the check needs no other deployment to be up: the page asks them itself.
  for (const { name, origin } of deployments) {
    await page.route(`${origin}/healthz`, route => route.fulfill({
      headers: { 'access-control-allow-origin': '*' },
      json: { status: 'ok', service: 'remy-auth', release: `release-of-${name}`, environment: name },
    }));
  }
  await page.goto(localizedPath('/app/settings', 'en'));
  await expect(page.locator('[data-versions] [data-deployment="own"]')).toHaveAttribute('data-answered', 'yes');
  for (const { name, origin } of deployments) {
    const card = page.locator(`[data-versions] [data-deployment="${origin}"]`);
    if (origin === new URL(baseURL!).origin) { await expect(card).toHaveCount(0); continue; }
    await expect(card).toHaveAttribute('data-answered', 'yes');
    await expect(card.locator('[data-version="environment"]')).toHaveText(name);
    await expect(card.locator('[data-version="release"]')).toHaveText(`release-of-${name}`);
  }
});
