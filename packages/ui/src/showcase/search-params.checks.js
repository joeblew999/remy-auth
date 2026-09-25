// Checks for the typed, validated search params on the formats page (./search-params.tsx).
// Plain JavaScript like ../checks.js; Node's Intl is the oracle for the formatted text.
import { test, expect } from '@playwright/test';
import { locales } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { localizedPath, collectErrors, checkedLocales } from '../checks.js';

// Mirrors search-params.tsx on purpose: the check states the contract, not the implementation.
const defaults = { currency: 'EUR', count: 3, calendar: 'gregory' };

/** What the chosen rows must show for these values in this locale. */
function expected(locale, { currency, count, calendar }) {
  return {
    'chosen-currency': new Intl.NumberFormat(locale, { style: 'currency', currency }).format(samples.amount),
    'chosen-count': m.apps_count({ count }, { locale }),
    'chosen-calendar': new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar, timeZone: 'UTC' }).format(samples.date),
  };
}

async function expectChosen(page, locale, values) {
  for (const [sample, text] of Object.entries(expected(locale, values))) {
    await expect(page.locator(`[data-sample="${sample}"]`), `${locale} ${sample}`).toHaveText(text);
  }
  const controls = page.locator('[data-showcase="search-params"]');
  await expect(controls.locator(`[data-currency-choice="${values.currency}"]`)).toHaveAttribute('aria-current', 'page');
  await expect(controls.locator(`[data-count-choice="${values.count}"]`)).toHaveAttribute('aria-current', 'page');
  await expect(controls.locator(`[data-calendar-choice="${values.calendar}"]`)).toHaveAttribute('aria-current', 'page');
  await expect(controls.locator('[aria-current="page"]')).toHaveCount(3);
}

/**
 * The formats page's search params: invalid values fall back to their defaults and the URL is
 * normalised (defaults left out); chosen values render, also in the server HTML when
 * `serverRendered`; the controls set one param each and keep the others; and the resulting URL,
 * shared into a fresh browser, shows the same values. Every locale.
 */
export function searchParamsChecks({ serverRendered = true } = {}) {
  const cases = [
    ['?currency=XYZ&count=abc&calendar=nope', '', defaults],
    ['?currency=EUR&count=3&calendar=gregory', '', defaults],
    ['?currency=JPY&count=-1', '?currency=JPY', { ...defaults, currency: 'JPY' }],
    ['?count=2.5&calendar=islamic', '?calendar=islamic', { ...defaults, calendar: 'islamic' }],
    ['?count=1001&currency=jpy', '', defaults],
    // Params the page does not own are left alone (analytics tags, for example).
    ['?utm_source=x&count=0011', '?utm_source=x&count=11', { ...defaults, count: 11 }],
  ];

  for (const locale of checkedLocales) {
    const path = localizedPath('/formats', locale);

    test(`${locale}: invalid search params fall back to defaults and the URL is normalised`, async ({ page, request, baseURL }) => {
      const errors = collectErrors(page);
      for (const [search, normalised, values] of cases) {
        if (serverRendered) {
          // The server answers a non-canonical URL with a redirect to the canonical one.
          const response = await request.get(`${path}${search}`, { maxRedirects: 0 });
          if (normalised === search) expect(response.status(), search).toBe(200);
          else {
            expect(response.status(), search).toBeGreaterThanOrEqual(300);
            expect(response.status(), search).toBeLessThan(400);
            const location = new URL(response.headers()['location'], baseURL);
            expect(location.pathname + location.search, search).toBe(`${path}${normalised}`);
          }
        }
        await page.goto(`${path}${search}`);
        await expect(page, search).toHaveURL(`${baseURL}${path}${normalised}`);
        await expectChosen(page, locale, values);
      }
      expect(errors).toEqual([]);
    });

    test(`${locale}: controls set typed search params; the URL round-trips into a fresh browser`, async ({ page, browser, baseURL }) => {
      const errors = collectErrors(page);
      await page.goto(path);
      await page.waitForLoadState('networkidle');
      await expectChosen(page, locale, defaults);
      const controls = page.locator('[data-showcase="search-params"]');
      const chosen = { currency: 'JPY', count: 11, calendar: 'islamic' };
      await controls.locator('[data-currency-choice="JPY"]').click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=JPY`);
      await expectChosen(page, locale, { ...defaults, currency: 'JPY' });
      await controls.locator('[data-count-choice="11"]').click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=JPY&count=11`);
      await controls.locator('[data-calendar-choice="islamic"]').click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=JPY&count=11&calendar=islamic`);
      await expectChosen(page, locale, chosen);
      // Back to the default currency: the param leaves the URL again.
      await controls.locator('[data-currency-choice="EUR"]').click();
      await expect(page).toHaveURL(`${baseURL}${path}?count=11&calendar=islamic`);
      await page.goBack();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=JPY&count=11&calendar=islamic`);
      await expectChosen(page, locale, chosen);
      expect(errors).toEqual([]);

      // Shareable: the same URL in a fresh browser shows the same values, without JavaScript when server-rendered.
      const shared = await browser.newContext({ javaScriptEnabled: !serverRendered });
      const other = await shared.newPage();
      expect((await other.goto(`${baseURL}${path}?currency=JPY&count=11&calendar=islamic`))?.status()).toBe(200);
      await expectChosen(other, locale, chosen);
      await shared.close();
    });
  }
}
