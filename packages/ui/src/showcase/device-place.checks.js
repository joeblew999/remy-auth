// Checks for the device's own location (the Geolocation API): asked only when the visitor presses
// the button, shown in the page's language, refused politely without permission, and never sent
// anywhere. Plain JavaScript, like ../checks.js.
import { test, expect } from '@playwright/test';
import { m } from '../paraglide/messages.js';
import { localizedPath, collectErrors, hydrated, checkedLocales } from '../checks.js';

const spot = { latitude: 13.7563, longitude: 100.5018, accuracy: 25 };
const degrees = (locale, value) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'degree', maximumFractionDigits: 4 }).format(value);
const metres = (locale, value) => new Intl.NumberFormat(locale, { style: 'unit', unit: 'meter', maximumFractionDigits: 0 }).format(value);

/** `path` is the de-localized page with the card; `network` is true where the page also knows Cloudflare's location. */
export function devicePlaceChecks({ path = '/formats', network = false } = {}) {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: the device's location is asked for only on request, shown in this language, and never sent`, async ({ browser }) => {
      const context = await browser.newContext({ geolocation: spot, permissions: ['geolocation'] });
      const page = await context.newPage();
      const errors = collectErrors(page);
      const sent = [];
      page.on('request', request => {
        const text = `${request.url()} ${request.postData() ?? ''}`;
        if (text.includes(String(spot.latitude)) || text.includes(String(spot.longitude))) sent.push(request.url());
      });
      await page.goto(localizedPath(path, locale));
      const card = page.locator('[data-showcase="device-place"]');
      const button = card.getByRole('button', { name: m.device_place_button({}, o), exact: true });
      await hydrated(button);
      await expect(card.locator('[data-sample="device-latitude"]')).toHaveCount(0);
      await button.click();
      await expect(card.locator('[data-sample="device-latitude"]')).toHaveText(degrees(locale, spot.latitude));
      await expect(card.locator('[data-sample="device-longitude"]')).toHaveText(degrees(locale, spot.longitude));
      await expect(card.locator('[data-sample="device-accuracy"]')).toHaveText(metres(locale, spot.accuracy));
      if (network) await expect(card.locator('[data-sample="device-distance"]')).toHaveCount(1);
      expect(sent).toEqual([]);
      expect(errors).toEqual([]);
      await context.close();
    });
  }

  test('without permission the device location is refused in the page language', async ({ browser }) => {
    const context = await browser.newContext({ permissions: [] });
    const page = await context.newPage();
    await page.goto(localizedPath(path, 'en'));
    const card = page.locator('[data-showcase="device-place"]');
    const button = card.getByRole('button', { name: m.device_place_button({}, { locale: 'en' }), exact: true });
    await hydrated(button);
    await button.click();
    await expect(card.getByRole('status')).toHaveText(m.device_place_denied({}, { locale: 'en' }));
    await expect(card.locator('[data-sample="device-latitude"]')).toHaveCount(0);
    await context.close();
  });
}
