// Checks for the not-found and error pages, the time-zone sub-resource that throws notFound(),
// and read-only server routes. Plain JavaScript, like ../checks.js. Call `problemChecks` once from
// a test file of a server-rendered app; every option is optional so an app passes what it has.
import { test, expect } from '@playwright/test';
import { locales } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { direction, localizedPath, checkedLocales } from '../checks.js';

const zoneName = (locale, zone, style) => new Intl.DateTimeFormat(locale, { timeZone: zone, timeZoneName: style })
  .formatToParts(samples.instant).find(part => part.type === 'timeZoneName')?.value ?? zone;

// What a leaked error would look like: stack frames, error class names, source paths.
const leak = /\bat \S+ \(|\bat \S+:\d+:\d+|\b(?:Type|Reference|Range|Syntax)?Error: |\.tsx?:\d+/;

/**
 * - `timeZones`: `{ known, alias, unknown }`, zone names for the /time-zones/<name> sub-resource:
 *   a known zone renders its localized page, another spelling of it redirects permanently to the
 *   known spelling, and an unknown one is a localized 404 naming it (the route's loader throws notFound()).
 * - `failingNavigation`: `{ from, link, fail, heading }`, a client navigation from `from` through
 *   the link named by message key `link` to a route whose loader calls the server: with `fail` (a
 *   URL glob) answering 500 with a stack trace, the route's localized error page shows without the
 *   error, and its retry recovers once the server answers (heading = message key `heading`).
 * - `serverRoutes`: `[{ path, type, cache, origin }]`, read-only server routes: GET and HEAD answer
 *   with the content type and Cache-Control, `origin` bodies hold the request's origin (generated
 *   per request, not a static file), and every other method is 405 with Allow: GET, HEAD.
 */
export function problemChecks({ timeZones, failingNavigation, serverRoutes = [] } = {}) {
  if (timeZones) {
    const { known, alias, unknown } = timeZones;
    for (const locale of checkedLocales) {
      const o = { locale };
      test(`${locale}: an unknown time zone is a localized 404 page; a known one renders without JavaScript`, async ({ browser, baseURL }) => {
        const context = await browser.newContext({ javaScriptEnabled: false });
        const page = await context.newPage();
        const missing = await page.goto(`${baseURL}${localizedPath(`/time-zones/${unknown}`, locale)}`);
        expect(missing?.status()).toBe(404);
        expect(missing?.headers()['cache-control']).toBe('no-store');
        await expect(page.locator('html')).toHaveAttribute('lang', locale);
        await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
        await expect(page).toHaveTitle(m.not_found({}, o));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.not_found({}, o));
        await expect(page.locator('[data-problem="not-found"] p')).toHaveText(m.zone_not_found({ zone: unknown }, o));
        await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', 'noindex');
        await expect(page.locator('link[rel="canonical"]')).toHaveCount(0);

        const url = `${baseURL}${localizedPath(`/time-zones/${known}`, locale)}`;
        expect((await page.goto(url))?.status()).toBe(200);
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(zoneName(locale, known, 'longGeneric'));
        await expect(page).toHaveTitle(`${zoneName(locale, known, 'longGeneric')} | Remy`);
        await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', m.zone_description({}, o));
        await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', url);
        for (const other of locales) await expect(page.locator(`link[hreflang="${other}"]`)).toHaveAttribute('href', `${baseURL}${localizedPath(`/time-zones/${known}`, other)}`);
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
        const response = await request.get(localizedPath(`/time-zones/${alias}`, locale), { maxRedirects: 0 });
        expect(response.status(), locale).toBe(301);
        expect(response.headers()['location']).toMatch(new RegExp(`${localizedPath(`/time-zones/${known}`, locale)}$`));
      }
      await page.setViewportSize({ width: 375, height: 812 });
      for (const locale of checkedLocales) {
        const response = await page.goto(localizedPath(`/time-zones/${unknown}`, locale));
        expect(response?.status()).toBe(404);
        await page.waitForLoadState('networkidle');
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.not_found({}, { locale }));
        await page.goto(localizedPath(`/time-zones/${known}`, locale));
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(zoneName(locale, known, 'longGeneric'));
        expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale} overflows`).toBe(true);
      }
    });
  }

  if (failingNavigation) {
    const { from, link, fail, heading } = failingNavigation;
    for (const locale of checkedLocales) {
      const o = { locale };
      test(`${locale}: a loader that fails on the server shows the localized error page without the error, and retry recovers`, async ({ page }) => {
        await page.goto(localizedPath(from, locale));
        await page.waitForLoadState('networkidle');
        const secret = 'Error: loader exploded\n    at secretFunction (/src/secret.ts:12:34)';
        await page.route(fail, route => route.fulfill({ status: 500, contentType: 'text/plain', body: secret }));
        await page.locator('#main').getByRole('link', { name: m[link]({}, o), exact: true }).click();
        const problem = page.locator('[data-problem="error"]');
        await expect(problem.getByRole('heading', { level: 1 })).toHaveText(m.error_title({}, o));
        await expect(problem.locator('p')).toHaveText(m.error_detail({}, o));
        await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
        const text = await page.locator('body').innerText();
        expect(text).not.toContain('secret');
        expect(text).not.toContain('exploded');
        expect(text).not.toMatch(leak);
        await page.unroute(fail);
        await problem.getByRole('button', { name: m.retry({}, o), exact: true }).click();
        await expect(page.getByRole('heading', { level: 1 })).toHaveText(m[heading]({}, o));
        await expect(problem).toHaveCount(0);
      });
    }
  }

  if (serverRoutes.length) {
    test('read-only server routes answer GET and HEAD with their type and caching, and 405 for other methods', async ({ request, baseURL }) => {
      for (const { path, type, cache, origin } of serverRoutes) {
        const response = await request.get(path, { maxRedirects: 0 });
        expect(response.status(), path).toBe(200);
        expect(response.headers()['content-type'], path).toBe(type);
        expect(response.headers()['cache-control'], path).toBe(cache);
        expect(response.headers()['x-request-id'], path).toBeTruthy();
        if (origin) expect(await response.text(), path).toContain(`${baseURL}/`);
        const head = await request.head(path, { maxRedirects: 0 });
        expect(head.status(), `HEAD ${path}`).toBe(200);
        expect(head.headers()['content-type'], `HEAD ${path}`).toBe(type);
        expect((await head.body()).length, `HEAD ${path}`).toBe(0);
        for (const method of ['POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']) {
          const other = await request.fetch(path, { method, maxRedirects: 0 });
          expect(other.status(), `${method} ${path}`).toBe(405);
          expect(other.headers()['allow'], `${method} ${path}`).toBe('GET, HEAD');
          expect(other.headers()['cache-control'], `${method} ${path}`).toBe('no-store');
        }
      }
    });
  }
}
