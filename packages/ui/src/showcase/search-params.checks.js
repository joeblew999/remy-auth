// Checks for the typed, validated search params on the formats page (./search-params.tsx).
// Plain JavaScript like ../checks.js; Node's Intl is the oracle for the formatted text.
import { test, expect } from '@playwright/test';
import { locales } from '../paraglide/runtime.js';
import { m } from '../paraglide/messages.js';
import { samples } from '../samples.js';
import { localizedPath, collectErrors, checkedLocales, formatTag } from '../checks.js';
import { allChoices, choiceKinds, searchDefaults as defaults } from '../locale-data.js';

// The defaults and choices come from the same derived module the page and its schema read
// (../locale-data.js), so a new locale's calendar, digits, currency and plural forms need no edit here.
/** A choice of each control other than its default: the last one over all locales. */
const other = Object.fromEntries(choiceKinds.map(kind => [kind, allChoices(kind).findLast(value => value !== defaults[kind])]));

/** What the chosen rows must show for these values in this locale. */
function expected(locale, { currency, count, calendar, numbering }) {
  return {
    'chosen-currency': new Intl.NumberFormat(formatTag(locale), { style: 'currency', currency }).format(samples.amount),
    'chosen-count': m.apps_count({ count }, { locale }),
    'chosen-calendar': new Intl.DateTimeFormat(formatTag(locale), { ...samples.calendarDate, calendar }).format(samples.date),
    'chosen-numbering': new Intl.NumberFormat(formatTag(locale), { numberingSystem: numbering }).format(samples.decimal),
  };
}

async function expectChosen(page, locale, values) {
  for (const [sample, text] of Object.entries(expected(locale, values))) {
    await expect(page.locator(`[data-sample="${sample}"]`), `${locale} ${sample}`).toHaveText(text);
  }
  const controls = page.locator('[data-showcase="search-params"]');
  for (const kind of choiceKinds) await expect(controls.locator(`[data-${kind}-choice="${values[kind]}"]`)).toHaveAttribute('aria-current', 'page');
  await expect(controls.locator('[aria-current="page"]')).toHaveCount(choiceKinds.length);
}

/**
 * The formats page's search params: invalid values fall back to their defaults and the URL is
 * normalised (defaults left out); chosen values render, also in the server HTML when
 * `serverRendered`; the controls set one param each and keep the others; and the resulting URL,
 * shared into a fresh browser, shows the same values. Every locale.
 */
export function searchParamsChecks({ serverRendered = true } = {}) {
  const { currency, count, calendar, numbering } = other;
  const cases = [
    ['?currency=XYZ&count=abc&calendar=nope&numbering=nope', '', defaults],
    [`?currency=${defaults.currency}&count=${defaults.count}&calendar=${defaults.calendar}&numbering=${defaults.numbering}`, '', defaults],
    [`?currency=${currency}&count=-1`, `?currency=${currency}`, { ...defaults, currency }],
    [`?count=2.5&calendar=${calendar}`, `?calendar=${calendar}`, { ...defaults, calendar }],
    [`?numbering=${numbering}&count=1001`, `?numbering=${numbering}`, { ...defaults, numbering }],
    [`?count=1001&currency=${currency.toLowerCase()}`, '', defaults],
    // Params the page does not own are left alone (analytics tags, for example).
    [`?utm_source=x&count=000${count}`, `?utm_source=x&count=${count}`, { ...defaults, count }],
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
      const chosen = other;
      const query = `?currency=${currency}&count=${count}&calendar=${calendar}&numbering=${numbering}`;
      await controls.locator(`[data-currency-choice="${currency}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=${currency}`);
      await expectChosen(page, locale, { ...defaults, currency });
      await controls.locator(`[data-count-choice="${count}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=${currency}&count=${count}`);
      await controls.locator(`[data-calendar-choice="${calendar}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${path}?currency=${currency}&count=${count}&calendar=${calendar}`);
      await controls.locator(`[data-numbering-choice="${numbering}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${path}${query}`);
      await expectChosen(page, locale, chosen);
      // Back to the default currency: the param leaves the URL again.
      await controls.locator(`[data-currency-choice="${defaults.currency}"]`).click();
      await expect(page).toHaveURL(`${baseURL}${path}?count=${count}&calendar=${calendar}&numbering=${numbering}`);
      await page.goBack();
      await expect(page).toHaveURL(`${baseURL}${path}${query}`);
      await expectChosen(page, locale, chosen);
      expect(errors).toEqual([]);

      // Shareable: the same URL in a fresh browser shows the same values, without JavaScript when server-rendered.
      const shared = await browser.newContext({ javaScriptEnabled: !serverRendered });
      const fresh = await shared.newPage();
      expect((await fresh.goto(`${baseURL}${path}${query}`))?.status()).toBe(200);
      await expectChosen(fresh, locale, chosen);
      await shared.close();
    });
  }
}
