// Checks for the live status card (TanStack Query with the router): the server HTML already holds
// the status, the browser refetches it on an interval, and the card's refresh control, which
// invalidates every loader and query, refetches at once. Plain JavaScript, like ../checks.js.
import { test, expect } from '@playwright/test';
import { locales } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { localizedPath, collectErrors, checkedLocales } from '../checks.js';

const serverFunction = response => new URL(response.url()).pathname.startsWith('/_serverFn/');

/** `path` is the de-localized page that mounts the card; `service` is the Worker's name in /healthz. */
export function statusCardChecks({ service, path = '', refreshMs = 10_000 }) {
  test(`the live status card is in the server HTML of every language, with /healthz's service and release`, async ({ request }) => {
    const health = await (await request.get('/healthz')).json();
    for (const locale of checkedLocales) {
      const response = await request.get(localizedPath(path, locale));
      expect(response.status(), locale).toBe(200);
      const html = await response.text();
      expect(html, locale).toContain('data-status="ok"');
      expect(html, locale).toContain(`<dd data-live="status">${m.live_status_ok({}, { locale })}</dd>`);
      expect(html, locale).toContain(`<code>${health.service}</code>`);
      expect(html, locale).toContain(`<code>${health.release}</code>`);
      expect(health.service).toBe(service);
    }
  });

  test('the live status card refetches in the browser on its interval, and refreshing invalidates at once', async ({ page }) => {
    const errors = collectErrors(page);
    const card = page.locator('.status-card [data-status]');
    // Playwright's clock lets the check jump the refresh interval instead of waiting it out.
    await page.clock.install();
    await page.goto(localizedPath(path, 'en'));
    await page.waitForLoadState('networkidle');
    await expect(card).toHaveAttribute('data-status', 'ok');
    // The server's answer, hydrated from the SSR integration: no refetch on hydration.
    const rendered = Number(await card.getAttribute('data-updated'));
    expect(rendered).toBeGreaterThan(0);

    // Nothing touched: the interval alone asks the server function again.
    const polled = page.waitForResponse(serverFunction, { timeout: 5_000 });
    await page.clock.fastForward(refreshMs);
    expect((await polled).status()).toBe(200);
    await expect.poll(async () => Number(await card.getAttribute('data-updated')), { timeout: 5_000 }).toBeGreaterThan(rendered);
    const afterPoll = Number(await card.getAttribute('data-updated'));

    // The refresh control runs invalidateEverything: the query refetches well before the next tick,
    // and every route loader runs again (the router's matches, from the handle TanStack Router
    // keeps on window in the browser, get a newer update time).
    const loaded = () => page.evaluate(() => Math.max(...window.__TSR_ROUTER__.state.matches.map(match => match.updatedAt)));
    const beforeRefresh = await loaded();
    const refreshed = page.waitForResponse(serverFunction, { timeout: refreshMs / 2 });
    await page.getByRole('button', { name: m.live_refresh({}, { locale: 'en' }), exact: true }).click();
    expect((await refreshed).status()).toBe(200);
    await expect.poll(async () => Number(await card.getAttribute('data-updated')), { timeout: refreshMs / 2 }).toBeGreaterThan(afterPoll);
    await expect.poll(loaded, { timeout: refreshMs / 2 }).toBeGreaterThan(beforeRefresh);
    await expect(card.locator('[data-live="status"]')).toHaveText(m.live_status_ok({}, { locale: 'en' }));
    expect(errors).toEqual([]);
  });
}
