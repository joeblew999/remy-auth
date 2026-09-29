// The time-zones part's checks: its route /time-zones/<zone> (a known zone renders its localized page without
// JavaScript, another spelling redirects permanently to it, an unknown one is a localized 404 naming it).
// Plain JavaScript, like the platform's checks.
import { test, expect } from '@playwright/test';
import { locales } from '@joeblew999/remy-ui/runtime';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { direction, localizedPath, checkedLocales } from '@joeblew999/remy-ui/checks';

const base = '/time-zones';
const zoneName = (locale, zone, style) => new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style })
  .formatToParts(samples.instant).find(part => part.type === 'timeZoneName')?.value ?? zone;

export function timeZonesChecks({ known = 'Asia/Tokyo', alias = 'asia/tokyo', unknown = 'Mars/Olympus_Mons' } = {}) {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: an unknown time zone is a localized 404 page; a known one renders without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      const missing = await page.goto(`${baseURL}${localizedPath(`${base}/${unknown}`, locale)}`);
      expect(missing?.status()).toBe(404);
      expect(missing?.headers()['cache-control']).toBe('no-store');
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
      await expect(page).toHaveTitle(m.not_found({}, o));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.not_found({}, o));
      await expect(page.locator('[data-problem="not-found"] p')).toHaveText(m.zone_not_found({ zone: unknown }, o));
      await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
      await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

      const url = `${baseURL}${localizedPath(`${base}/${known}`, locale)}`;
      expect((await page.goto(url))?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(zoneName(locale, known, 'longGeneric'));
      // The zone's name, then the app's brand (pageHead's title).
      await expect(page).toHaveTitle(new RegExp(`^${zoneName(locale, known, 'longGeneric').replace(/[.*+?^${}()|[\]\\]/g, '\\$&')} \\| `));
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', m.zone_description({}, o));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
      for (const other of locales) await expect(page.locator(`link[hreflang="${other}"]`)).toHaveAttribute('href', `${baseURL}${localizedPath(`${base}/${known}`, other)}`);
      await expect(page.locator('meta[name="robots"]')).toHaveCount(0);
      await expect(page.locator('[data-sample="zone"]')).toHaveText(known);
      await expect(page.locator('[data-sample="zone-offset"]')).toHaveText(zoneName(locale, known, 'longOffset'));
      await expect(page.locator('[data-sample="zone-local"]')).toHaveText(
        new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: known }).format(samples.instant));
      await context.close();
    });
  }

  test('another spelling of a time zone redirects permanently to its page; the unknown zone page fits and hydrates', async ({ request, page }) => {
    for (const locale of checkedLocales) {
      const response = await request.get(localizedPath(`${base}/${alias}`, locale), { maxRedirects: 0 });
      expect(response.status(), locale).toBe(301);
      expect(response.headers()['location']).toMatch(new RegExp(`${localizedPath(`${base}/${known}`, locale)}$`));
    }
    await page.setViewportSize({ width: 375, height: 812 });
    for (const locale of checkedLocales) {
      const response = await page.goto(localizedPath(`${base}/${unknown}`, locale));
      expect(response?.status()).toBe(404);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.not_found({}, { locale }));
      await page.goto(localizedPath(`${base}/${known}`, locale));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(zoneName(locale, known, 'longGeneric'));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} overflows`).toBe(true);
    }
  });
}

/** The part's checks, as partChecks() runs them. */
export default options => timeZonesChecks(options);
