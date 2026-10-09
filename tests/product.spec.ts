import { test, expect } from '@playwright/test';
import { localizedPath } from '@joeblew999/remy-ui/checks';
import { deployments } from '../src/deployments';

// The product's name is the app's to give (docs/content/dev/gui.md, "The product's name"): Remy is
// this prototype's, and a project built on the same code has its own. Nothing in the shared packages
// may say it for them. What the pages show is the shared productNameChecks' (every app runs it; the
// consumer fixture, called "My app", is where it bites); what no page shows is in tests/unit.

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
