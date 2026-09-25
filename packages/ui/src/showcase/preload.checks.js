// Checks for intent preloading and loader caching: every in-app Link preloads its route on hover
// (the router's `defaultPreload: 'intent'`), and the formats route's `staleTime` lets Back and
// Forward reuse its loader data. Plain JavaScript like ../checks.js.
import { test, expect } from '@playwright/test';
import { m } from '../paraglide/messages.js';
import { localizedPath } from '../checks.js';

const isServerFn = request => new URL(request.url()).pathname.startsWith('/_serverFn/');
const isScript = request => request.resourceType() === 'script';
/** Anything a navigation could fetch: code, data, server functions or a whole document. */
const isRouteRequest = request => isScript(request) || isServerFn(request) || ['fetch', 'xhr', 'document'].includes(request.resourceType());

function record(page) {
  const requests = [];
  page.on('request', request => requests.push(request));
  return { requests, since: mark => requests.slice(mark), get mark() { return requests.length; } };
}

/**
 * `serverFn` is true when the formats route's loader calls a server function (a server-rendered
 * app reading Cloudflare's request); a prerendered app passes false and the check then requires
 * no data request at all.
 */
export function preloadChecks({ serverFn = true, locale = 'en' } = {}) {
  const o = { locale };

  test('hovering an in-app link loads its route code and data before the click; the click then fetches nothing', async ({ page, baseURL }) => {
    const log = record(page);
    await page.goto(localizedPath('', locale));
    await page.waitForLoadState('networkidle');
    const link = page.getByRole('link', { name: m.formats_link({}, o), exact: true });

    const beforeHover = log.mark;
    await link.hover();
    // The formats route's component chunk (autoCodeSplitting) and, for a server-rendered app, its loader's server function.
    await expect.poll(() => log.since(beforeHover).filter(isScript).length, { message: 'route chunk preloaded on hover' }).toBeGreaterThan(0);
    if (serverFn) await expect.poll(() => log.since(beforeHover).filter(isServerFn).length, { message: 'server function preloaded on hover' }).toBeGreaterThan(0);
    await page.waitForLoadState('networkidle');

    const beforeClick = log.mark;
    await link.click();
    await expect(page).toHaveURL(`${baseURL}${localizedPath('/formats', locale)}`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.formats_title({}, o));
    await page.mouse.move(0, 0);
    await page.waitForLoadState('networkidle');
    expect(log.since(beforeClick).filter(isRouteRequest).map(request => request.url()), 'requests after the click').toEqual([]);
  });

  test('back and forward reuse cached loader data: no server function or data request', async ({ page, baseURL }) => {
    const log = record(page);
    await page.goto(localizedPath('/formats', locale));
    await page.waitForLoadState('networkidle');
    await page.getByRole('link', { name: m.home_link({}, o), exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}${localizedPath('', locale)}`);
    await page.getByRole('link', { name: m.formats_link({}, o), exact: true }).click();
    await expect(page).toHaveURL(`${baseURL}${localizedPath('/formats', locale)}`);
    await page.mouse.move(0, 0);
    await page.waitForLoadState('networkidle');

    const mark = log.mark;
    for (const step of ['back', 'forward', 'back', 'forward']) {
      if (step === 'back') await page.goBack(); else await page.goForward();
      const formats = step === 'forward';
      await expect(page).toHaveURL(`${baseURL}${localizedPath(formats ? '/formats' : '', locale)}`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(formats ? m.formats_title({}, o) : m.home_title({}, o));
    }
    await page.waitForLoadState('networkidle');
    expect(log.since(mark).filter(request => isServerFn(request) || ['fetch', 'xhr', 'document'].includes(request.resourceType())).map(request => request.url()),
      'requests during back and forward').toEqual([]);
  });
}
