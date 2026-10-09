// The demo reservation's API checks (the showcase's POST /api/reservations, in remy-auth's contract): the typed
// 400 in every locale, and a response that breaks the contract refused in the browser. Plain JavaScript.
import { test, expect } from '@playwright/test';
import { locales, cookieName } from '@joeblew999/remy-ui/runtime';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { collectErrors, localizedPath, checkedLocales } from '@joeblew999/remy-ui/checks';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * The demo reservation over the contract's POST endpoint, for every locale. Direct calls: input
 * that breaks the rules is the typed INVALID_RESERVATION 400 with field errors in the language
 * Accept-Language asks for, input of the wrong shape is oRPC's 400, and a valid one is confirmed
 * in that language. In the page: the server rejects what the browser allowed (21 guests, a blank
 * name) in the page's language even when Paraglide's cookie names another, confirms a valid
 * reservation with its own message, and every answer carries the Worker's request ID. A response
 * that breaks the contract is refused in the browser: the page shows the failure, never the data.
 */
export function reservationApiChecks({ path = '/app/demo', endpoint = '/api/reservations' } = {}) {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: POST ${endpoint} answers invalid input with the typed 400 in this language`, async ({ request }) => {
      const headers = { 'Accept-Language': locale };
      const broken = await request.post(endpoint, { headers, data: { name: '   ', guests: 21 } });
      expect(broken.status()).toBe(400);
      expect(broken.headers()['x-request-id']).toMatch(uuid);
      const error = await broken.json();
      expect(error).toMatchObject({ defined: true, code: 'INVALID_RESERVATION',
        data: { name: m.name_required({}, o), guests: m.guests_invalid({}, o) } });

      const malformed = await request.post(endpoint, { headers, data: { name: samples.guest, guests: '3' } });
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toMatchObject({ defined: false, code: 'BAD_REQUEST' });

      const valid = await request.post(endpoint, { headers, data: { name: samples.guest, guests: 3 } });
      expect(valid.status()).toBe(200);
      expect(await valid.json()).toEqual({ message: m.reserved({ name: samples.guest, count: 3 }, o) });
    });

    test(`${locale}: the reservation endpoint validates again, answers in the page's language and keeps the request ID`, async ({ page }) => {
      const errors = collectErrors(page);
      const isCall = url => new URL(url).pathname === endpoint;
      let tamper;
      await page.route(url => isCall(url.href), async route => {
        const call = route.request().postDataJSON();
        tamper?.(call);
        await route.continue({ postData: JSON.stringify(call) });
      });
      const submit = async () => (await Promise.all([
        page.waitForResponse(response => isCall(response.url())),
        page.getByRole('button', { name: m.submit({}, o), exact: true }).click(),
      ]))[0];
      await page.goto(localizedPath(path, locale));
      // Another tab has since chosen another language: the answer must still follow this page, not Paraglide's cookie.
      const other = locales.find(value => value !== locale);
      await page.context().addCookies([{ name: cookieName, value: other, url: new URL('/', page.url()).href }]);
      await page.getByLabel(m.name_label({}, o), { exact: true }).fill(samples.guest);
      await page.getByLabel(m.guests_label({}, o), { exact: true }).fill('3');

      // The browser accepted 3 guests; the server receives 21.
      tamper = call => { call.guests = 21; };
      let response = await submit();
      expect(response.status()).toBe(400);
      await expect(page.locator('#guests-error')).toHaveText(m.guests_invalid({}, o));
      await expect(page.locator('#name-error')).toHaveCount(0);
      await expect(page.locator('.reserved')).toHaveText('');
      expect((await response.json()).data.guests).toBe(m.guests_invalid({}, o));

      // The browser sent a name; the server receives only spaces, and trims them.
      tamper = call => { call.name = '   '; };
      response = await submit();
      await expect(page.locator('#name-error')).toHaveText(m.name_required({}, o));
      await expect(page.locator('#guests-error')).toHaveCount(0);
      await expect(page.locator('.reserved')).toHaveText('');

      // Untouched: the confirmation is the server's, under the response's own request ID.
      tamper = undefined;
      response = await submit();
      const reserved = m.reserved({ name: samples.guest, count: 3 }, o);
      await expect(page.locator('.reserved')).toHaveText(reserved);
      await expect(page.locator('#name-error, #guests-error')).toHaveCount(0);
      expect((await response.json()).message).toBe(reserved);
      const id = response.headers()['x-request-id'];
      expect(id).toMatch(uuid);

      // A call the page would never make (guests as text) is a bad request, under its own request ID.
      const refused = await page.request.post(response.url(), { headers: { 'Accept-Language': locale }, data: { name: samples.guest, guests: '3' } });
      expect(refused.status()).toBe(400);
      expect(refused.headers()['x-request-id']).toMatch(uuid);
      expect(refused.headers()['x-request-id']).not.toBe(id);
      expect(await refused.text()).not.toContain(reserved);
      // The only console errors are Chrome's own lines for the two refused calls above.
      // Chrome's own line for each rejected call; HTTP/2 (Cloudflare) has no reason phrase, HTTP/1.1 (local) does.
      expect(errors).toHaveLength(2);
      for (const error of errors) expect(error).toMatch(/^Failed to load resource: the server responded with a status of 400 \((Bad Request)?\)$/);
    });

    test(`${locale}: a reservation answer that breaks the contract is refused in the browser`, async ({ page }) => {
      const errors = collectErrors(page);
      await page.goto(localizedPath(path, locale));
      await page.getByLabel(m.name_label({}, o), { exact: true }).fill(samples.guest);
      await page.getByLabel(m.guests_label({}, o), { exact: true }).fill('3');
      // A 200 whose confirmation is a number, not the contract's text.
      const broken = 'not-in-the-contract';
      await page.route(url => new URL(url.href).pathname === endpoint, route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ message: 7, extra: broken }) }));
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('.reserved')).toHaveText(m.error_detail({}, o));
      await expect(page.locator('#name-error, #guests-error')).toHaveCount(0);
      await expect(page.locator('body')).not.toContainText(broken);
      expect(errors).toEqual([]);
    });
  }
}
