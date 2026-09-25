// Checks for streaming with deferred data on the formats page: the loader returns Cloudflare's
// place unawaited and the page renders it through <Await> with a pending skeleton. Plain
// JavaScript, like ../checks.js.
import { test, expect } from '@playwright/test';
import { m } from '../paraglide/messages.js';
import { localizedPath, collectErrors } from '../checks.js';

const rows = ['country', 'place', 'cf-timezone', 'cf-local'];

/** `path` is the de-localized page with the deferred group; `from` is a page linking to it. */
export function deferredPlaceChecks({ path = '/formats', from = '' } = {}) {
  test('the formats page is a streamed response whose final document holds the deferred place', async ({ request }) => {
    const response = await request.get(localizedPath(path, 'en'));
    expect(response.status()).toBe(200);
    // Streamed: sent in chunks as it renders, never buffered to a known length.
    expect(response.headers()['content-length']).toBeUndefined();
    expect(response.headers()['transfer-encoding']).toBe('chunked');
    const html = await response.text();
    // The document the stream ends with is complete: every place row, no skeleton left for crawlers or no-JavaScript visitors.
    for (const row of rows) expect(html, row).toContain(`data-sample="${row}"`);
    expect(html).toContain(m.location_heading({}, { locale: 'en' }));
    expect(html.indexOf('<h1')).toBeLessThan(html.indexOf('data-sample="country"'));
  });

  test('a client navigation shows the page at once, the skeleton while the place is on its way, then the place', async ({ page }) => {
    const errors = collectErrors(page);
    await page.goto(localizedPath(from, 'en'));
    await page.waitForLoadState('networkidle');
    // Hold every server-function call (the place is one) until the skeleton has been seen.
    let release;
    const held = new Promise(resolve => { release = resolve; });
    await page.route('**/_serverFn/**', async route => { await held; await route.continue(); });
    await page.locator('#main').getByRole('link', { name: m.formats_link({}, { locale: 'en' }), exact: true }).click();
    // The navigation did not wait for the deferred data: the page and the skeleton are there, the rows are not.
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.formats_title({}, { locale: 'en' }));
    await expect(page.locator('.place-skeleton')).toBeVisible();
    await expect(page.locator('.place-skeleton')).toContainText(m.location_heading({}, { locale: 'en' }));
    for (const row of rows) await expect(page.locator(`[data-sample="${row}"]`), row).toHaveCount(0);
    release();
    // The awaited promise resolves and <Await> replaces the skeleton with the real rows.
    await expect(page.locator('.place-skeleton')).toHaveCount(0);
    for (const row of rows) await expect(page.locator(`[data-sample="${row}"]`), row).toBeVisible();
    const zone = await page.locator('[data-sample="cf-timezone"]').getAttribute('data-timezone');
    await expect(page.locator('[data-sample="cf-timezone"]')).toHaveText(zone || m.location_unknown({}, { locale: 'en' }));
    await page.unroute('**/_serverFn/**');
    expect(errors).toEqual([]);
  });
}
