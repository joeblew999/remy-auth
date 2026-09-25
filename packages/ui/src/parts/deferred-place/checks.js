// The deferred-place part's checks (moved with its code from remy-auth's test file): the streamed
// place (../../showcase/deferred-place.checks.js), its rows matching Intl on the formats page without
// JavaScript, and the localized error page when its server function fails during a client navigation.
import { test, expect } from '@playwright/test';
import { m } from '../../paraglide/messages.js';
import { checkedLocales, formatTag, localizedPath } from '../../checks.js';
import { samples } from '../../samples.js';
import { deferredPlaceChecks } from '../../showcase/deferred-place.checks.js';
import { problemChecks } from '../../showcase/problem.checks.js';

/** `path` is the de-localized page with the place; `from` a page linking to it through `link` (a message key). */
export function deferredPlacePartChecks({ path = '/formats', from = '', link = 'formats_link', heading = 'formats_title' } = {}) {
  deferredPlaceChecks({ path, from });

  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: Cloudflare's place on the formats page matches Intl without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      expect((await page.goto(`${baseURL}${localizedPath(path, locale)}`))?.status()).toBe(200);
      // Cloudflare's geolocation depends on where the request comes from; the page exposes what it used.
      const unknown = m.location_unknown({}, o);
      const format = formatTag(locale);
      const zone = await page.locator('[data-sample="cf-timezone"]').getAttribute('data-timezone');
      await expect(page.locator('[data-sample="cf-timezone"]')).toHaveText(zone || unknown);
      await expect(page.locator('[data-sample="cf-local"]')).toHaveText(zone
        ? new Intl.DateTimeFormat(format, { dateStyle: 'full', timeStyle: 'long', timeZone: zone }).format(samples.instant) : unknown);
      const country = await page.locator('[data-sample="country"]').getAttribute('data-country');
      await expect(page.locator('[data-sample="country"]')).toHaveText(country ? new Intl.DisplayNames([locale], { type: 'region' }).of(country) : unknown);
      await context.close();
    });
  }

  // The page's loader calls the part's server function: failing it shows the localized error page.
  problemChecks({ failingNavigation: { from, link, fail: '**/_serverFn/**', heading } });
}
