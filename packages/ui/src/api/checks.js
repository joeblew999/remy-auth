// Checks for an app's contract-first API (.plans/openapi-contracts.md): coverage of the router,
// the generated OpenAPI document and its reference page, and for the demo reservation: invalid
// input gives the typed 400 in every locale, and a response that breaks the contract is rejected
// in the browser. Plain JavaScript, like ../checks.js; requests are plain JSON over HTTP.
import { test, expect } from '@playwright/test';
import { oc } from '@orpc/contract';
import { z } from 'zod';
import { locales, cookieName } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { collectErrors, localizedPath, checkedLocales } from '../checks.js';
import { coverageProblems, procedures } from './coverage.js';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/**
 * `router` is the app's implemented oRPC router (the one its /api route mounts). Every procedure
 * has a route, a policy and documented errors; the served document lists exactly those routes
 * with their error responses; the reference page points at it; unknown API paths are 404s.
 */
export function apiChecks({ router, title }) {
  test('every API procedure has a route under /api/, a policy, an output and documented errors', () => {
    expect(coverageProblems(router)).toEqual([]);
    // The rule itself catches each gap, so an empty list above means something.
    const bare = { missing: oc.input(z.object({ id: z.string() })).output(z.object({})) };
    expect(coverageProblems(bare)).toEqual(['missing: no HTTP method', 'missing: no path under /api/', 'missing: no policy', 'missing: takes input but documents no error']);
  });

  test('the OpenAPI 3.1 document is generated from the router and served with its reference page', async ({ request }) => {
    const response = await request.get('/api/openapi.json');
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toContain('application/json');
    const spec = await response.json();
    expect(spec.openapi).toMatch(/^3\.1\./);
    expect(spec.info.title).toBe(title);
    const expected = procedures(router).map(({ procedure }) => procedure['~orpc'].route);
    const served = Object.entries(spec.paths).flatMap(([path, operations]) => Object.keys(operations).map(method => `${method.toUpperCase()} ${path}`));
    expect(served.sort()).toEqual(expected.map(route => `${route.method} ${route.path}`).sort());
    for (const { path, procedure } of procedures(router)) {
      const { route, errorMap } = procedure['~orpc'];
      const operation = spec.paths[route.path][route.method.toLowerCase()];
      expect(Object.keys(operation.responses), path).toContain('200');
      for (const [code, error] of Object.entries(errorMap)) {
        const body = operation.responses[String(error.status)]?.content?.['application/json']?.schema;
        expect(JSON.stringify(body ?? null), `${path} documents ${code}`).toContain(`"const":"${code}"`);
      }
    }

    // The reference page embeds the same document and loads the pinned Scalar script; opened as a
    // document it is not redirected to a localized URL (the API has no locale).
    const docs = await request.get('/api/doc', { headers: { 'Sec-Fetch-Dest': 'document' }, maxRedirects: 0 });
    expect(docs.status()).toBe(200);
    expect(docs.headers()['content-type']).toContain('text/html');
    const html = await docs.text();
    expect(html).toContain(`<title>${title}</title>`);
    expect(html).toMatch(/<script src="https:\/\/cdn\.jsdelivr\.net\/npm\/@scalar\/api-reference@\d+\.\d+\.\d+"><\/script>/);
    // oRPC escapes the embedded document for HTML: every slash is \u002F.
    for (const route of expected) expect(html, route.path).toContain(route.path.replaceAll('/', '\\u002F'));

    const missing = await request.get('/api/no-such-endpoint');
    expect(missing.status()).toBe(404);
    expect((await missing.json()).code).toBe('NOT_FOUND');
  });
}

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
      expect(error).toMatchObject({ defined: true, code: 'INVALID_RESERVATION', status: 400,
        data: { name: m.name_required({}, o), guests: m.guests_invalid({}, o) } });

      const malformed = await request.post(endpoint, { headers, data: { name: samples.guest, guests: '3' } });
      expect(malformed.status()).toBe(400);
      expect(await malformed.json()).toMatchObject({ defined: false, code: 'BAD_REQUEST', status: 400 });

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
