// Checks for the live status card (./status-card.tsx, TanStack Query with the router). On the app
// that serves the status, the server HTML already holds it; on a consumer of that app's contract,
// the browser asks the other origin (CORS), and only from the origin the other app registered.
// Either way the browser refetches it on an interval, the card's refresh control, which
// invalidates every loader and query, refetches at once, and an answer that breaks the contract is
// shown as an error, never as data. Plain JavaScript, like ../checks.js.
import { test, expect } from '@playwright/test';
import { m } from '../paraglide/messages.js';
import { localizedPath, collectErrors, checkedLocales, hydrated } from '../checks.js';

/**
 * `path` is the de-localized page that mounts the card; `service` is the name the card must show
 * (the answering Worker's, as its /healthz says); `endpoint` is the path the browser asks for the
 * status (a contract endpoint such as /api/status), or, by default, any server function.
 * `origin` is set on a consumer: the other app's origin the browser asks, so the prerendered HTML
 * holds no status; `registered` is then the one origin of this app that the other app lets call
 * it (its CORS list). Pages served from any other origin (local runs, previews) must not ask.
 */
export function statusCardChecks({ service, path = '', refreshMs = 10_000, endpoint, origin, registered }) {
  const cross = Boolean(origin);
  if (cross && !endpoint) throw new Error('statusCardChecks: a consumer (origin) names the endpoint it asks');
  const isStatusCall = url => {
    const { origin: from, pathname } = new URL(url);
    if (cross) return from === new URL(origin).origin && pathname === endpoint;
    return endpoint ? pathname === endpoint : pathname.startsWith('/_serverFn/');
  };
  // Whether pages served from this run's origin ask for the status at all.
  const asks = baseURL => !cross || new URL(baseURL).origin === new URL(registered).origin;
  const card = page => page.locator('.status-card [data-status]');

  if (!cross) {
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
  } else {
    test('the prerendered live status card holds no status in any language: only the browser asks', async ({ request }) => {
      for (const locale of checkedLocales) {
        const response = await request.get(localizedPath(path, locale));
        expect(response.status(), locale).toBe(200);
        const html = await response.text();
        const start = html.indexOf('class="status-card');
        expect(start, locale).toBeGreaterThan(-1);
        const card = html.slice(start, html.indexOf('</aside>', start));
        expect(card, locale).not.toContain('data-status=');
        expect(card, locale).toContain('<dd data-live="status">…</dd>');
        expect(html, locale).toContain(m.live_status_note_browser({}, { locale }));
      }
    });

    test(`the live status card asks ${origin} only from ${registered}`, async ({ page, baseURL }) => {
      test.skip(asks(baseURL), `pages from ${registered} ask; the next check covers them`);
      const errors = collectErrors(page);
      const calls = [];
      page.on('request', request => { if (isStatusCall(request.url())) calls.push(request.url()); });
      await page.goto(localizedPath(path, 'en'));
      await hydrated(page.locator('.status-card'));
      await page.waitForLoadState('networkidle');
      expect(calls).toEqual([]);
      await expect(page.locator('.status-card [data-live="status"]')).toHaveText('…');
      expect(errors).toEqual([]);
    });
  }

  test('the live status card refetches in the browser on its interval, and refreshing invalidates at once', async ({ page, baseURL }) => {
    test.skip(!asks(baseURL), `only pages from ${registered} ask ${origin}`);
    const errors = collectErrors(page);
    // Playwright's clock lets the check jump the refresh interval instead of waiting it out.
    await page.clock.install();
    const first = cross ? page.waitForResponse(response => isStatusCall(response.url())) : undefined;
    await page.goto(localizedPath(path, 'en'));
    await page.waitForLoadState('networkidle');
    await expect(card(page)).toHaveAttribute('data-status', 'ok');
    if (cross) {
      // Asked across origins: the other Worker names this page's origin, and the card shows its answer.
      const response = await first;
      expect(response.status()).toBe(200);
      expect(response.headers()['access-control-allow-origin']).toBe(new URL(page.url()).origin);
      await expect(page.locator('.status-card [data-live="service"]')).toHaveText(service);
    }
    // The first answer: the server's, hydrated from the SSR integration (no refetch on hydration),
    // or on a consumer the browser's own first call.
    const rendered = Number(await card(page).getAttribute('data-updated'));
    expect(rendered).toBeGreaterThan(0);

    // Nothing touched: the interval alone asks again.
    const polled = page.waitForResponse(response => isStatusCall(response.url()), { timeout: 5_000 });
    await page.clock.fastForward(refreshMs);
    expect((await polled).status()).toBe(200);
    await expect.poll(async () => Number(await card(page).getAttribute('data-updated')), { timeout: 5_000 }).toBeGreaterThan(rendered);
    const afterPoll = Number(await card(page).getAttribute('data-updated'));

    // The refresh control runs invalidateEverything: the query refetches well before the next tick,
    // and every route loader runs again (the router's matches, from the handle TanStack Router
    // keeps on window in the browser, get a newer update time).
    const loaded = () => page.evaluate(() => Math.max(...window.__TSR_ROUTER__.state.matches.map(match => match.updatedAt)));
    const beforeRefresh = await loaded();
    const refreshed = page.waitForResponse(response => isStatusCall(response.url()), { timeout: refreshMs / 2 });
    await page.getByRole('button', { name: m.live_refresh({}, { locale: 'en' }), exact: true }).click();
    expect((await refreshed).status()).toBe(200);
    await expect.poll(async () => Number(await card(page).getAttribute('data-updated')), { timeout: refreshMs / 2 }).toBeGreaterThan(afterPoll);
    await expect.poll(loaded, { timeout: refreshMs / 2 }).toBeGreaterThan(beforeRefresh);
    await expect(card(page).locator('[data-live="status"]')).toHaveText(m.live_status_ok({}, { locale: 'en' }));
    expect(errors).toEqual([]);
  });

  test('a status answer that breaks the contract is shown as an error, never as data', async ({ page, baseURL }) => {
    test.skip(!endpoint, 'only a contract endpoint has a response schema to break');
    test.skip(!asks(baseURL), `only pages from ${registered} ask ${origin}`);
    const errors = collectErrors(page);
    const broken = 'not-in-the-contract';
    await page.clock.install();
    await page.goto(localizedPath(path, 'en'));
    const pageOrigin = new URL(page.url()).origin;
    // A 200 whose status is not the contract's "ok" and whose service is a number.
    await page.route(url => isStatusCall(url.href), route => route.fulfill({
      status: 200, contentType: 'application/json',
      headers: cross ? { 'access-control-allow-origin': pageOrigin, vary: 'Origin' } : {},
      body: JSON.stringify({ status: broken, service: 7, release: broken }),
    }));
    const refresh = page.getByRole('button', { name: m.live_refresh({}, { locale: 'en' }), exact: true });
    await hydrated(refresh);
    await refresh.click();
    // Query retries a failed call three times, backing off; the clock skips the waits.
    await expect.poll(async () => {
      await page.clock.runFor(1_000);
      return card(page).getAttribute('data-status');
    }, { timeout: 20_000 }).toBe('error');
    await expect(card(page).locator('[data-live="status"]')).toHaveText(m.error_title({}, { locale: 'en' }));
    await expect(page.locator('.status-card')).not.toContainText(broken);
    expect(errors).toEqual([]);
  });
}
