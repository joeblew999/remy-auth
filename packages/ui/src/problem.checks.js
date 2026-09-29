// Checks for the error page of a failing navigation and for read-only server routes. Plain JavaScript, like ./checks.js. Call `problemChecks` once from
// a test file of a server-rendered app; every option is optional so an app passes what it has.
import { test, expect } from '@playwright/test';
import { m } from './paraglide/messages.js';
import { direction, localizedPath, checkedLocales } from './checks.js';

// What a leaked error would look like: stack frames, error class names, source paths.
const leak = /\bat \S+ \(|\bat \S+:\d+:\d+|\b(?:Type|Reference|Range|Syntax)?Error: |\.tsx?:\d+/;

/**
 * - `failingNavigation`: `{ from, link, fail, heading }`, a client navigation from `from` through
 *   the link named by message key `link` to a route whose loader calls the server: with `fail` (a
 *   URL glob) answering 500 with a stack trace, the route's localized error page shows without the
 *   error, and its retry recovers once the server answers (heading = message key `heading`).
 * - `serverRoutes`: `[{ path, type, cache, origin }]`, read-only server routes: GET and HEAD answer
 *   with the content type and Cache-Control, `origin` bodies hold the request's origin (generated
 *   per request, not a static file), and every other method is 405 with Allow: GET, HEAD.
 */
export function problemChecks({ failingNavigation, serverRoutes = [] } = {}) {
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
