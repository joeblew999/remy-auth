import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { samples } from '../app/formats';
import { localeInfo, weekdayName } from '../packages/ui/src/locale-info';
import { publicPaths } from '../app/routes/sitemap';

// The inlang project is the only locale list; the catalogs and Node's own Intl are the oracles.
const settings = JSON.parse(readFileSync('packages/ui/project.inlang/settings.json', 'utf8'));
const locales: string[] = settings.locales;
const baseLocale: string = settings.baseLocale;
const catalogs: Record<string, Record<string, any>> = Object.fromEntries(
  locales.map(locale => [locale, JSON.parse(readFileSync(`packages/ui/messages/${locale}.json`, 'utf8'))]));
const endonym = (locale: string) => new Intl.DisplayNames([locale], { type: 'language' }).of(locale)!;
const direction = (locale: string): string => (new Intl.Locale(locale) as any).getTextInfo().direction;
const list = (locale: string) => new Intl.ListFormat(locale, { type: 'conjunction' });
const euros = (locale: string) => new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(samples.amount);
const pluralText = (locale: string, count: number) =>
  catalogs[locale].apps_count[0].match[`countPlural=${new Intl.PluralRules(locale).select(count)}`].replace('{count}', String(count));
test.use({ timezoneId: 'Asia/Tokyo' });
const collectErrors = (page: Page) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
};

test('every catalog matches the base catalog and covers its plural categories', () => {
  const base = catalogs[baseLocale];
  for (const locale of locales) {
    const catalog = catalogs[locale];
    expect(Object.keys(catalog).sort(), locale).toEqual(Object.keys(base).sort());
    for (const [key, value] of Object.entries(base)) {
      const other = catalog[key];
      if (typeof value === 'string') {
        expect(typeof other, `${locale}.${key}`).toBe('string');
        expect(other.trim(), `${locale}.${key}`).not.toBe('');
        expect(other.match(/\{\w+\}/g) ?? [], `${locale}.${key}`).toEqual(value.match(/\{\w+\}/g) ?? []);
      } else {
        // Variant messages share declarations and selectors; plural categories differ per language.
        expect(other[0].declarations, `${locale}.${key}`).toEqual(value[0].declarations);
        expect(other[0].selectors ?? [], `${locale}.${key}`).toEqual(value[0].selectors ?? []);
        for (const pattern of Object.values(other[0].match)) expect(String(pattern).trim(), `${locale}.${key}`).not.toBe('');
      }
    }
    for (const [key, value] of Object.entries(catalog)) {
      if (typeof value === 'string') continue;
      const declaration = (value[0].declarations as string[]).find(line => /: plural\b/.test(line));
      if (!declaration) continue;
      const ordinal = /type=ordinal/.test(declaration);
      const categories = Object.keys(value[0].match).map(match => match.split('=')[1]);
      const rules = new Intl.PluralRules(locale, { type: ordinal ? 'ordinal' : 'cardinal' });
      for (const n of ordinal ? samples.positions : samples.counts) expect(categories, `${locale}.${key} category for ${n}`).toContain(rules.select(n));
    }
  }
});

for (const locale of locales) {
  test(`${locale}: public page is meaningful without JavaScript`, async ({ browser, baseURL }) => {
    const messages = catalogs[locale];
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}/${locale}`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-request-id']).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.home_title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/${locale}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', messages.home_description);
    for (const alternate of [...locales, 'x-default']) {
      await expect(page.locator(`link[hreflang="${alternate}"]`)).toHaveAttribute('href', `${baseURL}/${alternate === 'x-default' ? baseLocale : alternate}`);
    }
    for (const other of locales) {
      await expect(page.getByRole('link', { name: endonym(other), exact: true })).toHaveAttribute('href', `/${other}`);
    }
    await context.close();
  });

  test(`${locale}: formats page shows this language's own formats without JavaScript`, async ({ browser, baseURL }) => {
    const messages = catalogs[locale];
    const info = localeInfo(locale as any);
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}/${locale}/formats`);
    expect(response?.status()).toBe(200);
    await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/${locale}/formats`);
    await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${baseURL}/${baseLocale}/formats`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.formats_title);
    const expected: Record<string, string> = {
      tag: locale,
      name: endonym(locale),
      direction: messages[direction(locale) === 'rtl' ? 'direction_rtl' : 'direction_ltr'],
      languages: list(locale).format(locales.map(endonym)),
      instant: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(samples.instant),
      date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(samples.date),
      relative: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(samples.days, 'day'),
      decimal: new Intl.NumberFormat(locale).format(samples.decimal),
      percent: new Intl.NumberFormat(locale, { style: 'percent' }).format(samples.share),
      currency: euros(locale),
      region: new Intl.DisplayNames([locale], { type: 'region' }).of(samples.region)!,
      'currency-name': new Intl.DisplayNames([locale], { type: 'currency' }).of('EUR')!,
      range: new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd),
      compact: new Intl.NumberFormat(locale, { notation: 'compact' }).format(samples.big),
      distance: new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilometer', unitDisplay: 'long' }).format(samples.km),
      currencies: list(locale).format(samples.currencies.map(currency => new Intl.NumberFormat(locale, { style: 'currency', currency }).format(samples.amount))),
      sorted: list(locale).format([...samples.names].sort(new Intl.Collator(locale).compare)),
      greeting: messages.greeting.replace('{name}', samples.guest),
      ...Object.fromEntries(samples.statuses.map(status => [`status-${status}`, messages.invite_status[0].match[`status=${status}`] ?? messages.invite_status[0].match['status=*']])),
      calendar: new Intl.DisplayNames([locale], { type: 'calendar' }).of(info.calendar)!,
      numbering: `${info.numberingSystem} · ${new Intl.NumberFormat(locale, { numberingSystem: info.numberingSystem }).format(samples.decimal)}`,
      'hour-cycle': messages[['h11', 'h12'].includes(info.hourCycle) ? 'hour_cycle_12' : 'hour_cycle_24'],
      'week-start': weekdayName(locale as any, info.firstDay!),
      weekend: list(locale).format(info.weekend!.map(day => weekdayName(locale as any, day))),
    };
    if (info.otherCalendars.length === 0) await expect(page.locator('[data-sample="other-calendars"]')).toHaveText(messages.no_other_calendars);
    for (const calendar of info.otherCalendars) {
      await expect(page.locator(`[data-calendar="${calendar}"]`), calendar).toHaveText(
        `${new Intl.DisplayNames([locale], { type: 'calendar' }).of(calendar)}: ${new Intl.DateTimeFormat(locale, { dateStyle: 'long', calendar, timeZone: 'UTC' }).format(samples.date)}`);
    }
    for (const [sample, text] of Object.entries(expected)) await expect(page.locator(`[data-sample="${sample}"]`), sample).toHaveText(text);
    for (const count of samples.counts) await expect(page.locator(`[data-count="${count}"]`)).toHaveText(pluralText(locale, count));
    const ordinal = new Intl.PluralRules(locale, { type: 'ordinal' });
    for (const n of samples.positions) {
      await expect(page.locator(`[data-position="${n}"]`)).toHaveText(messages.position_value[0].match[`ordinal=${ordinal.select(n)}`].replace('{n}', String(n)));
    }
    await context.close();
  });
}

for (const locale of locales) {
  test(`${locale}: demo form validates and confirms a reservation in this language`, async ({ page }) => {
    const messages = catalogs[locale];
    const errors = collectErrors(page);
    await page.goto(`/${locale}/demo`);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.demo_title);
    await page.getByRole('button', { name: messages.submit, exact: true }).click();
    await expect(page.locator('#name-error')).toHaveText(messages.name_required);
    await expect(page.locator('#name')).toHaveAttribute('aria-invalid', 'true');
    await page.getByLabel(messages.name_label, { exact: true }).fill(samples.guest);
    await page.getByLabel(messages.guests_label, { exact: true }).fill('3');
    await page.getByRole('button', { name: messages.submit, exact: true }).click();
    await expect(page.locator('#name-error')).toHaveCount(0);
    const category = new Intl.PluralRules(locale).select(3);
    await expect(page.locator('.reserved')).toHaveText(messages.reserved[0].match[`countPlural=${category}`].replace('{name}', samples.guest).replace('{count}', '3'));
    expect(errors).toEqual([]);
  });
}

test('root redirect negotiates the language from Accept-Language', async ({ request }) => {
  for (const [header, expected] of [['es-MX,es;q=0.9,en;q=0.8', 'es'], ['ar-EG', 'ar'], ['de-DE,de;q=0.9', baseLocale], ['*', baseLocale]]) {
    const response = await request.get('/', { maxRedirects: 0, headers: { 'Accept-Language': header } });
    expect(response.status(), header).toBe(302);
    expect(response.headers()['location'], header).toMatch(new RegExp(`/${expected}$`));
    expect(response.headers()['vary'] ?? '', header).toContain('Accept-Language');
  }
});

test('concurrent SSR requests retain their requested language and direction', async ({ request }) => {
  await Promise.all(Array.from({ length: 6 * locales.length }, async (_, index) => {
    const locale = locales[index % locales.length];
    const other = locales[(index + 1) % locales.length];
    const response = await request.get(`/${locale}/formats`, { headers: { 'Accept-Language': other } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}" dir="${direction(locale)}"`);
    expect(html).toContain(catalogs[locale].formats_title);
    expect(html).toContain(euros(locale));
  }));
});

test('formats page hydrates in every language without errors', async ({ page }) => {
  const errors = collectErrors(page);
  for (const locale of locales) {
    await page.goto(`/${locale}/formats`);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
    await expect(page.locator('[data-sample="currency"]')).toHaveText(euros(locale));
    await expect(page.locator('[data-count="100"]')).toHaveText(pluralText(locale, 100));
    await expect(page.locator('[data-sample="local"]')).toHaveText(new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Tokyo' }).format(samples.instant));
  }
  expect(errors).toEqual([]);
});

test('client-only demo is indexable, interactive and switches language in the same tab', async ({ page, request, context }) => {
  const en = catalogs[baseLocale];
  const errors = collectErrors(page);
  const response = await request.get(`/${baseLocale}/demo`);
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toContain('noindex');
  expect(html).not.toContain('class="counter-card"');
  await page.goto(`/${baseLocale}`);
  await page.getByRole('link', { name: en.demo_link }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.demo_title);
  await page.getByRole('button', { name: en.increment, exact: true }).click();
  await expect(page.locator('output')).toHaveText('1');
  await page.getByRole('button', { name: en.reset, exact: true }).click();
  await expect(page.locator('output')).toHaveText('0');
  const target = locales.find(locale => locale !== baseLocale)!;
  await page.getByRole('link', { name: endonym(target), exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/${target}/demo$`));
  await expect(page.getByRole('button', { name: catalogs[target].increment, exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', target);
  expect(context.pages()).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('missing routes, root redirect and sitemap are correct', async ({ request, baseURL }) => {
  expect((await request.get('/', { maxRedirects: 0 })).status()).toBe(302);
  for (const path of ['/en/missing', '/zz', '/zz/demo', '/zz/formats']) expect((await request.get(path)).status()).toBe(404);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  const urls = [...(await sitemap.text()).matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
  expect(urls.sort()).toEqual(locales.flatMap(locale => publicPaths.map(path => `${baseURL}/${locale}${path}`)).sort());
  const xml = await sitemap.text();
  for (const lang of [...locales, 'x-default']) expect(xml.match(new RegExp(`hreflang="${lang}"`, 'g'))?.length, lang).toBe(urls.length);
  for (const url of urls) {
    const response = await request.get(url);
    expect(response.status(), url).toBe(200);
    expect(await response.text(), url).toContain(`<link rel="canonical" href="${url}"`);
  }
  expect(await (await request.get('/robots.txt')).text()).toContain('/sitemap.xml');
});

test('right-to-left languages mirror the header and every page fits a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const locale of locales) for (const path of publicPaths) {
    await page.goto(`/${locale}${path}`);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}${path} overflows`).toBe(true);
    const brand = (await page.locator('.brand').boundingBox())!;
    const languages = (await page.locator('nav.languages').boundingBox())!;
    if (direction(locale) === 'rtl') expect(brand.x, `${locale}${path} brand starts on the right`).toBeGreaterThan(languages.x);
    else expect(brand.x, `${locale}${path} brand starts on the left`).toBeLessThan(languages.x);
  }
});
