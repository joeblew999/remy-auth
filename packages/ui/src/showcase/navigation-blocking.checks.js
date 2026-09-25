// Checks for navigation blocking on the demo form (./navigation-blocking.tsx): unsaved input asks
// before an in-app navigation, in the page's language; a made reservation no longer asks.
// Plain JavaScript like ../checks.js.
import { test, expect } from '@playwright/test';
import { locales } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { localizedPath, collectErrors, hydrated, checkedLocales } from '../checks.js';

/** Answers each dialog from `answers` in turn (true accepts) and records its type and message. */
function dialogs(page, answers) {
  const seen = [];
  page.on('dialog', async dialog => {
    seen.push({ type: dialog.type(), message: dialog.message() });
    if (answers.shift()) await dialog.accept(); else await dialog.dismiss();
  });
  return seen;
}

export function navigationBlockingChecks() {
  for (const locale of checkedLocales) {
    const o = { locale };
    const demo = localizedPath('/demo', locale);
    const home = localizedPath('', locale);

    test(`${locale}: leaving the demo form with unsaved input asks first; after a reservation it does not`, async ({ page, baseURL }) => {
      const errors = collectErrors(page);
      const answers = [false, true];
      const seen = dialogs(page, answers);
      const name = page.getByLabel(m.name_label({}, o), { exact: true });
      const overview = page.getByRole('link', { name: m.home_link({}, o), exact: true });

      // Untouched: leaving does not ask. Act once React has hydrated the form, as a visitor's click
      // before hydration is a plain page load that no script can guard.
      await page.goto(demo);
      await hydrated(name);
      await overview.click();
      await expect(page).toHaveURL(`${baseURL}${home}`);
      expect(seen).toEqual([]);

      // Typed but not reserved: the first answer stays, the second leaves.
      await page.goto(demo);
      await hydrated(name);
      await name.fill(samples.guest);
      await overview.click();
      await expect.poll(() => seen.length).toBe(1);
      expect(seen[0]).toEqual({ type: 'confirm', message: m.leave_unsaved({}, o) });
      await expect(page).toHaveURL(`${baseURL}${demo}`);
      await expect(name).toHaveValue(samples.guest);
      await overview.click();
      await expect(page).toHaveURL(`${baseURL}${home}`);
      expect(seen).toHaveLength(2);

      // Reserved: nothing left to lose, so leaving does not ask.
      await page.goto(demo);
      await hydrated(name);
      await name.fill(samples.guest);
      await page.getByLabel(m.guests_label({}, o), { exact: true }).fill('3');
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('.reserved')).not.toBeEmpty();
      await overview.click();
      await expect(page).toHaveURL(`${baseURL}${home}`);
      expect(seen).toHaveLength(2);
      expect(errors).toEqual([]);
    });
  }
}
