import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';

const en = JSON.parse(readFileSync('packages/ui/messages/en.json', 'utf8'));
const es = JSON.parse(readFileSync('packages/ui/messages/es.json', 'utf8'));

test('translation catalogs have matching keys and interpolation parameters', () => {
  expect(Object.keys(es).sort()).toEqual(Object.keys(en).sort());
  for (const key of Object.keys(en)) {
    expect(es[key].trim()).not.toBe('');
    expect(es[key].match(/\{\w+\}/g) ?? []).toEqual(en[key].match(/\{\w+\}/g) ?? []);
  }
});

for (const [locale, messages] of [['en', en], ['es', es]] as const) {
  test(`${locale}: public page is meaningful without JavaScript`, async ({ browser, baseURL }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    const response = await page.goto(`${baseURL}/${locale}`);
    expect(response?.status()).toBe(200);
    expect(response?.headers()['x-request-id']).toBeTruthy();
    await expect(page.locator('html')).toHaveAttribute('lang', locale);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(messages.home_title);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}/${locale}`);
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', messages.home_description);
    for (const alternate of ['en', 'es', 'x-default']) {
      await expect(page.locator(`link[hreflang="${alternate}"]`)).toHaveAttribute('href', `${baseURL}/${alternate === 'x-default' ? 'en' : alternate}`);
    }
    await context.close();
  });
}

test('concurrent SSR requests retain their requested language', async ({ request }) => {
  await Promise.all(Array.from({ length: 12 }, async (_, index) => {
    const locale = index % 2 ? 'es' : 'en';
    const response = await request.get(`/${locale}`, { headers: { 'Accept-Language': locale === 'es' ? 'en' : 'es' } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}"`);
    expect(html).toContain(locale === 'es' ? es.home_title : en.home_title);
  }));
});

test('client-only demo is indexable, interactive and switches language in the same tab', async ({ page, request, context }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  const response = await request.get('/en/demo');
  expect(response.status()).toBe(200);
  const html = await response.text();
  expect(html).not.toContain('noindex');
  expect(html).not.toContain('class="counter-card"');
  await page.goto('/en');
  await page.getByRole('link', { name: en.demo_link }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(en.demo_title);
  await page.getByRole('button', { name: en.increment, exact: true }).click();
  await expect(page.locator('output')).toHaveText('1');
  await page.getByRole('button', { name: en.reset, exact: true }).click();
  await expect(page.locator('output')).toHaveText('0');
  await page.getByRole('link', { name: 'Español', exact: true }).click();
  await expect(page).toHaveURL(/\/es\/demo$/);
  await expect(page.getByRole('button', { name: es.increment, exact: true })).toBeVisible();
  await expect(page.locator('html')).toHaveAttribute('lang', 'es');
  expect(context.pages()).toHaveLength(1);
  expect(errors).toEqual([]);
});

test('missing routes, root redirect and sitemap are correct', async ({ request }) => {
  expect((await request.get('/', { maxRedirects: 0 })).status()).toBe(302);
  for (const path of ['/en/missing', '/zz', '/zz/demo']) expect((await request.get(path)).status()).toBe(404);
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.status()).toBe(200);
  expect(await sitemap.text()).toContain('/es</loc>');
  expect(await sitemap.text()).toContain('/es/demo</loc>');
  expect(await (await request.get('/robots.txt')).text()).toContain('/sitemap.xml');
});

test('public page and demo fit a narrow screen', async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  for (const path of ['/es', '/es/demo']) {
    await page.goto(path);
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  }
});
