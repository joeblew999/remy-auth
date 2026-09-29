// The deferred-place part's checks (moved with its code from remy-auth's test file): the streamed
// place (./place.checks.js), its rows matching Intl on the formats page without
// JavaScript, and the localized error page when its server function fails during a client navigation.
import { test, expect } from '@playwright/test';
import { m } from '@joeblew999/remy-ui/messages';
import { checkedLocales, formatTag, localizedPath } from '@joeblew999/remy-ui/checks';
import { samples } from '@joeblew999/remy-ui/samples';
import { deferredPlaceChecks } from './place.checks.js';
import { problemChecks } from '@joeblew999/remy-ui/problem.checks';

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

/** The part's checks, as partChecks() runs them. */
export default options => deferredPlacePartChecks(options);
