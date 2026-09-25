// Checks for the demo form's server function (TanStack Start `createServerFn`) and the function
// middleware around it, for apps that pass DemoPage an `onReserve` server function. The browser
// validates first, so these checks change the call in flight: values the browser accepted become
// values only the server rejects. Reading and editing the call relies on the RPC's JSON encoding
// (Seroval nodes: `{ p: { k: keys, v: values } }`, scalars `{ s }`); if TanStack changes it, these
// checks fail rather than pass without testing anything.
import { test, expect } from '@playwright/test';
import { locales, cookieName } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { collectErrors, localizedPath, checkedLocales } from '../checks.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
const isServerFn = url => new URL(url).pathname.startsWith('/_serverFn/');

/** The encoded value stored under `key` anywhere in an RPC payload, to read (`.s`) or edit in place. */
function valueNode(tree, key) {
  const found = [];
  (function walk(value) {
    if (!value || typeof value !== 'object') return;
    const index = Array.isArray(value.p?.k) ? value.p.k.indexOf(key) : -1;
    if (index >= 0) found.push(value.p.v[index]);
    for (const child of Object.values(value)) walk(child);
  })(tree);
  expect(found, `exactly one "${key}" in the server function call`).toHaveLength(1);
  return found[0];
}

/**
 * For every locale: the server rejects what the browser allowed (21 guests, a blank name) with
 * field errors in the page's language (even when Paraglide's cookie names another), confirms a
 * valid reservation with its own message, and refuses a malformed call with 400. Every call's response carries the Worker's X-Request-ID,
 * and the function middleware returns the same ID with the result, so it saw it too.
 */
export function serverFunctionChecks({ path = '/demo' } = {}) {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: the reservation server function validates again, answers in the page's language and keeps the request ID`, async ({ page }) => {
      const errors = collectErrors(page);
      let tamper;
      await page.route(url => isServerFn(url.href), async route => {
        const call = route.request().postDataJSON();
        tamper?.(call);
        await route.continue({ postData: JSON.stringify(call) });
      });
      const submit = async () => (await Promise.all([
        page.waitForResponse(response => isServerFn(response.url())),
        page.getByRole('button', { name: m.submit({}, o), exact: true }).click(),
      ]))[0];
      await page.goto(localizedPath(path, locale));
      // Another tab has since chosen another language: the answer must still follow this page, not Paraglide's cookie.
      const other = locales.find(value => value !== locale);
      await page.context().addCookies([{ name: cookieName, value: other, url: new URL('/', page.url()).href }]);
      await page.getByLabel(m.name_label({}, o), { exact: true }).fill(samples.guest);
      await page.getByLabel(m.guests_label({}, o), { exact: true }).fill('3');

      // The browser accepted 3 guests; the server receives 21.
      tamper = call => { valueNode(call, 'guests').s = 21; };
      let response = await submit();
      await expect(page.locator('#guests-error')).toHaveText(m.guests_invalid({}, o));
      await expect(page.locator('#name-error')).toHaveCount(0);
      await expect(page.locator('.reserved')).toHaveText('');
      expect(valueNode(await response.json(), 'guests').s).toBe(m.guests_invalid({}, o));

      // The browser sent a name; the server receives only spaces, and trims them.
      tamper = call => { valueNode(call, 'name').s = '   '; };
      response = await submit();
      await expect(page.locator('#name-error')).toHaveText(m.name_required({}, o));
      await expect(page.locator('#guests-error')).toHaveCount(0);
      await expect(page.locator('.reserved')).toHaveText('');

      // Untouched: the confirmation is the server's, and the middleware saw the response's request ID.
      tamper = undefined;
      response = await submit();
      const reserved = m.reserved({ name: samples.guest, count: 3 }, o);
      await expect(page.locator('.reserved')).toHaveText(reserved);
      await expect(page.locator('#name-error, #guests-error')).toHaveCount(0);
      const body = await response.json();
      expect(valueNode(body, 'message').s).toBe(reserved);
      const id = response.headers()['x-request-id'];
      expect(id).toMatch(uuid);
      expect(valueNode(body, 'requestId').s).toBe(id);

      // A call the page would never make (guests as text) is a bad request, still under its own request ID.
      const malformed = response.request().postDataJSON();
      Object.assign(valueNode(malformed, 'guests'), { t: 1, s: '3' });
      const refused = await page.request.post(response.url(), {
        headers: { 'Content-Type': 'application/json', 'x-tsr-serverFn': 'true' }, data: JSON.stringify(malformed) });
      expect(refused.status()).toBe(400);
      expect(refused.headers()['x-request-id']).toMatch(uuid);
      expect(refused.headers()['x-request-id']).not.toBe(id);
      expect(await refused.text()).not.toContain(reserved);
      expect(errors).toEqual([]);
    });
  }
}
