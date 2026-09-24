// Shared Playwright checks for every app built on this package, so a consumer gets Google's
// checks with the code. Plain JavaScript: Playwright loads helpers from node_modules without
// transpiling. Node's own Intl is the oracle for formatted text; the compiled messages are the
// ones the app renders. Call the factories from a test file and pass the app's public paths.
import { test, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { locales, baseLocale, localizeUrl } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { samples } from './samples.js';

export const endonym = locale => new Intl.DisplayNames([locale], { type: 'language' }).of(locale);
export const direction = locale => new Intl.Locale(locale).getTextInfo().direction;
export const localizedPath = (path, locale) => localizeUrl(new URL(path || '/', 'http://localhost'), { locale }).pathname;
const weekday = (locale, day) => new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));

/** Collects page errors and console errors so a test can assert none happened. */
export function collectErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  return errors;
}

/**
 * Every localized public page carries its content and metadata in the initial HTML, unknown
 * paths are 404s, the sitemap lists only localized self-canonical URLs with hreflang
 * alternates, right-to-left languages mirror the header, and every page fits a phone.
 */
export function publicPageChecks({ paths, prerendered = false }) {
  for (const locale of locales) {
    const o = { locale };
    test(`${locale}: home page is complete without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      const response = await page.goto(`${baseURL}${localizedPath('', locale)}`);
      expect(response?.status()).toBe(200);
      await expect(page.locator('html')).toHaveAttribute('lang', locale);
      await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.home_title({}, o));
      await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', m.home_description({}, o));
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}${localizedPath('', locale)}`);
      for (const other of locales) await expect(page.locator(`link[hreflang="${other}"]`)).toHaveAttribute('href', `${baseURL}${localizedPath('', other)}`);
      await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${baseURL}/`);
      for (const other of locales) await expect(page.getByRole('link', { name: endonym(other), exact: true })).toHaveAttribute('href', localizedPath('', other));
      if (prerendered) await expect(page.locator('.language-hint')).toHaveCount(0);
      await context.close();
    });
  }

  test('unknown paths are 404s; the sitemap lists only localized, self-canonical URLs with hreflang alternates', async ({ request, baseURL }) => {
    for (const path of ['/zz', `${localizedPath('', baseLocale)}/missing`, '/zz/demo']) expect((await request.get(path)).status(), path).toBe(404);
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    expect(urls.sort()).toEqual(locales.flatMap(locale => paths.map(path => `${baseURL}${localizedPath(path, locale)}`)).sort());
    for (const url of urls) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      expect(await response.text(), url).toContain(`<link rel="canonical" href="${url}"`);
    }
    for (const lang of [...locales, 'x-default']) expect(xml.match(new RegExp(`hreflang="${lang}"`, 'g'))?.length, lang).toBe(urls.length);
    expect(await (await request.get('/robots.txt')).text()).toContain('/sitemap.xml');
  });

  test('right-to-left languages mirror the header and every page fits a narrow screen', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const locale of locales) for (const path of paths) {
      await page.goto(localizedPath(path, locale));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}${path} overflows`).toBe(true);
      const brand = await page.locator('.brand').boundingBox();
      const languages = await page.locator('nav.languages').boundingBox();
      if (direction(locale) === 'rtl') expect(brand.x, `${locale}${path}`).toBeGreaterThan(languages.x);
      else expect(brand.x, `${locale}${path}`).toBeLessThan(languages.x);
    }
  });
}

/**
 * URLs without a locale lead to the visitor's language, and a localized page offers the
 * preferred language without redirecting. `mode` is "redirect" for a server that answers with
 * 302 (Paraglide's middleware) or "static" for prerendered entry pages resolved in the browser.
 */
export function entryChecks({ paths, mode }) {
  if (mode === 'redirect') {
    test("URLs without a language redirect to the visitor's language: remembered choice, Accept-Language, else the base locale", async ({ request, browser, baseURL }) => {
      const cases = [
        [{ 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8' }, 'es'], [{ 'Accept-Language': 'ar-EG' }, 'ar'],
        [{ 'Accept-Language': 'de-DE,de;q=0.9' }, baseLocale], [{ 'Accept-Language': '*' }, baseLocale],
        [{ 'Accept-Language': 'en', Cookie: 'PARAGLIDE_LOCALE=ar' }, 'ar'], [{ Cookie: 'PARAGLIDE_LOCALE=zz' }, baseLocale],
      ];
      for (const [headers, expected] of cases) for (const path of paths) {
        const response = await request.get(path || '/', { maxRedirects: 0, headers });
        expect(response.status(), `${path} ${JSON.stringify(headers)}`).toBe(302);
        expect(response.headers()['location']).toMatch(new RegExp(`${localizedPath(path, expected)}$`));
        expect(response.headers()['vary'] ?? '').toContain('Accept-Language');
      }
      const context = await browser.newContext({ locale: 'ar' });
      const page = await context.newPage();
      await page.goto(`${baseURL}${paths[1] ?? '/'}`);
      await expect(page).toHaveURL(`${baseURL}${localizedPath(paths[1] ?? '', 'ar')}`);
      await context.close();
    });
  } else {
    test("entry URLs are static lists of every language, and the browser moves to the visitor's language", async ({ request, browser, baseURL }) => {
      for (const path of paths) {
        const response = await request.get(path || '/');
        expect(response.status(), path).toBe(200);
        const html = await response.text();
        expect(html).toContain(`<html lang="${baseLocale}"`);
        for (const locale of locales) expect(html).toContain(`href="${localizedPath(path, locale)}"`);
        expect(html).toContain(`<link rel="canonical" href="${baseURL}${path || '/'}"`);
        expect(html).toMatch(new RegExp(`hreflang="x-default" href="${baseURL}${path || '/'}"`, 'i'));
      }
      const context = await browser.newContext({ locale: 'es-ES' });
      const page = await context.newPage();
      await page.goto(`${baseURL}/`);
      await expect(page).toHaveURL(`${baseURL}${localizedPath('', 'es')}`);
      await context.close();
    });
  }

  test('a page in another language offers the preferred one; dismissing is remembered', async ({ browser, baseURL }) => {
    const context = await browser.newContext({ locale: 'es-ES' });
    const page = await context.newPage();
    await page.goto(`${baseURL}${localizedPath('', 'en')}`);
    const hint = page.locator('.language-hint');
    await expect(hint).toContainText(m.language_hint({ language: endonym('es') }, { locale: 'es' }));
    await expect(hint.getByRole('link')).toHaveAttribute('href', localizedPath('', 'es'));
    await hint.getByRole('button').click();
    await expect(hint).toHaveCount(0);
    await page.reload();
    await expect(hint).toHaveCount(0);
    await page.goto(`${baseURL}${paths[1] ?? '/'}`);
    await expect(page).toHaveURL(`${baseURL}${localizedPath(paths[1] ?? '', 'en')}`);
    await context.close();
  });
}

/** The interactive demo: the counter, the localized reservation form, and a same-tab language switch. */
export function demoChecks() {
  for (const locale of locales) {
    const o = { locale };
    test(`${locale}: demo counter, reservation form and language switch work after hydration`, async ({ page, context }) => {
      const errors = collectErrors(page);
      await page.goto(localizedPath('/demo', locale));
      await page.getByRole('button', { name: m.increment({}, o), exact: true }).click();
      await expect(page.locator('output')).toHaveText(new Intl.NumberFormat(locale).format(1));
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('#name-error')).toHaveText(m.name_required({}, o));
      await page.getByLabel(m.name_label({}, o), { exact: true }).fill(samples.guest);
      await page.getByLabel(m.guests_label({}, o), { exact: true }).fill('3');
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('.reserved')).toHaveText(m.reserved({ name: samples.guest, count: 3 }, o));
      const other = locales.find(value => value !== locale);
      await page.getByRole('link', { name: endonym(other), exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${localizedPath('/demo', other)}$`));
      await expect(page.locator('html')).toHaveAttribute('lang', other);
      expect(context.pages()).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  }
}

/**
 * The formats page's shared rows match Node's Intl for every locale: language, calendar,
 * digits, clock, week start, dates, numbers, currency, plurals and ordinals. `extra` checks
 * an app's additional rows.
 */
export function formatsChecks({ extra } = {}) {
  for (const locale of locales) {
    const o = { locale };
    test(`${locale}: formats page matches this language's Intl output without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      expect((await page.goto(`${baseURL}${localizedPath('/formats', locale)}`))?.status()).toBe(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}${localizedPath('/formats', locale)}`);
      await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${baseURL}/formats`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.formats_title({}, o));
      const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
      const tag = new Intl.Locale(locale);
      const numbering = tag.getNumberingSystems?.()[0] ?? resolved.numberingSystem;
      const expected = {
        tag: locale,
        name: endonym(locale),
        direction: direction(locale) === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o),
        languages: new Intl.ListFormat(locale, { type: 'conjunction' }).format(locales.map(endonym)),
        calendar: new Intl.DisplayNames([locale], { type: 'calendar' }).of(resolved.calendar),
        numbering: `${numbering} · ${new Intl.NumberFormat(locale, { numberingSystem: numbering }).format(samples.decimal)}`,
        'hour-cycle': ['h11', 'h12'].includes(resolved.hourCycle ?? '') ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o),
        'week-start': weekday(locale, tag.getWeekInfo().firstDay),
        instant: new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(samples.instant),
        date: new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeZone: 'UTC' }).format(samples.date),
        relative: new Intl.RelativeTimeFormat(locale, { numeric: 'auto' }).format(samples.days, 'day'),
        decimal: new Intl.NumberFormat(locale).format(samples.decimal),
        percent: new Intl.NumberFormat(locale, { style: 'percent' }).format(samples.share),
        compact: new Intl.NumberFormat(locale, { notation: 'compact' }).format(samples.big),
        currency: new Intl.NumberFormat(locale, { style: 'currency', currency: 'EUR' }).format(samples.amount),
      };
      for (const [sample, text] of Object.entries(expected)) await expect(page.locator(`[data-sample="${sample}"]`), sample).toHaveText(text);
      for (const count of samples.counts) await expect(page.locator(`[data-count="${count}"]`)).toHaveText(m.apps_count({ count }, o));
      for (const n of samples.positions) await expect(page.locator(`[data-position="${n}"]`)).toHaveText(m.position_value({ n }, o));
      await extra?.(page, locale);
      await context.close();
    });
  }
}

/**
 * Google Lighthouse through the pinned Chrome DevTools CLI against the same target as the other
 * checks. The CLI runs accessibility, SEO, best-practices and agentic-browsing; upstream excludes
 * Performance by design. Every scored audit must pass, not only the category score; none is exempt.
 */
export function lighthouseChecks({ pages }) {
  const cli = (...args) => execFileSync('./node_modules/.bin/chrome-devtools', args,
    { encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' }, timeout: 120_000 });
  test.describe('lighthouse', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });
    test.beforeAll(() => { cli('start', '--isolated', '--headless', '--no-usage-statistics', '--no-performance-crux'); });
    test.afterAll(() => { cli('stop'); });
    for (const { path, device } of pages) {
      test(`${device}: ${path} passes every audit`, async ({ baseURL }, testInfo) => {
        const dir = testInfo.outputPath('lighthouse');
        rmSync(dir, { recursive: true, force: true });
        cli('navigate_page', '1', '--url', `${baseURL}${path}`);
        cli('lighthouse_audit', '1', '--device', device, '--output-format', 'json', '--outputDirPath', dir);
        const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf8'));
        expect(report.finalDisplayedUrl).toBe(`${baseURL}${path}`);
        const failures = Object.values(report.categories).flatMap(category => category.auditRefs)
          .map(ref => report.audits[ref.id])
          .filter(audit => audit.score !== null && audit.score < 1)
          .map(audit => `${audit.id}: ${audit.title}`);
        await testInfo.attach('lighthouse.html', { path: `${dir}/report.html`, contentType: 'text/html' });
        expect([...new Set(failures)], 'See the lighthouse.html attachment in the HTML report').toEqual([]);
      });
    }
  });
}

/**
 * Core Web Vitals through Google's own `lighthouse` package (the Chrome DevTools CLI excludes
 * the Performance category), driving Playwright's Chrome over a debugging port. The gate is
 * Google's published "good" thresholds for the lab metrics and a Performance score of at least
 * 0.9; every failing audit is in the attached report. Call it from tests/performance.spec.ts, which
 * the shared Playwright config runs alone after all other checks. Tighten `thresholds` per project if needed.
 */
export function performanceChecks({ pages, thresholds = {} }) {
  const limits = { score: 0.9, lcp: 2500, cls: 0.1, tbt: 200, ...thresholds };
  test.describe('core web vitals', () => {
    test.describe.configure({ mode: 'serial', timeout: 180_000 });
    const port = 9222 + Math.floor(Math.random() * 1000);
    let browser, puppeteerBrowser;
    test.beforeAll(async () => {
      browser = await chromium.launch({ channel: 'chrome', args: [`--remote-debugging-port=${port}`] });
      // Lighthouse bundles puppeteer-core; connecting it to the same Chrome lets Lighthouse measure
      // a page this check has already warmed, so a fresh renderer's cold font scan (seconds on
      // macOS, never paid per page by real visitors) stays out of the numbers.
      const puppeteer = await import('puppeteer-core');
      puppeteerBrowser = await puppeteer.default.connect({ browserURL: `http://127.0.0.1:${port}` });
    });
    test.afterAll(async () => { await puppeteerBrowser?.disconnect(); await browser?.close(); });
    for (const { path, device } of pages) {
      test(`${device}: ${path} meets Google's good thresholds`, async ({ baseURL }, testInfo) => {
        const { navigation, desktopConfig, generateReport } = await import('lighthouse');
        const page = await puppeteerBrowser.newPage();
        await page.goto(`${baseURL}${path}`, { waitUntil: 'load' });
        const result = await navigation(page, `${baseURL}${path}`, {
          flags: { output: 'json', logLevel: 'error', onlyCategories: ['performance'] },
          config: device === 'desktop' ? desktopConfig : undefined,
        });
        await page.close();
        const { lhr } = result;
        await testInfo.attach('performance.html', { body: generateReport(lhr, 'html'), contentType: 'text/html' });
        expect(lhr.finalDisplayedUrl).toBe(`${baseURL}${path}`);
        const metrics = lhr.audits.metrics.details.items[0];
        const score = lhr.categories.performance.score;
        const failures = [];
        if (score < limits.score) failures.push(`performance score ${score} < ${limits.score}`);
        if (metrics.largestContentfulPaint > limits.lcp) failures.push(`LCP ${Math.round(metrics.largestContentfulPaint)} ms > ${limits.lcp} ms`);
        if (metrics.cumulativeLayoutShift > limits.cls) failures.push(`CLS ${metrics.cumulativeLayoutShift} > ${limits.cls}`);
        if (metrics.totalBlockingTime > limits.tbt) failures.push(`TBT ${Math.round(metrics.totalBlockingTime)} ms > ${limits.tbt} ms`);
        expect(failures, 'See the performance.html attachment in the HTML report').toEqual([]);
      });
    }
  });
}

/** Observability every Worker built on this package must show: a request ID on every response and a liveness route. */
export function observabilityChecks({ service, paths }) {
  test(`every response carries a request ID and /healthz answers for ${service}`, async ({ request }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const seen = new Set();
    for (const path of [...locales.flatMap(locale => paths.map(p => localizedPath(p, locale))), '/zz', '/robots.txt', '/sitemap.xml']) {
      const response = await request.get(path, { maxRedirects: 0 });
      const id = response.headers()['x-request-id'];
      expect(id, path).toMatch(uuid);
      expect(seen.has(id), `${path} reused a request ID`).toBe(false);
      seen.add(id);
    }
    const health = await request.get('/healthz');
    expect(health.status()).toBe(200);
    expect(health.headers()['cache-control']).toContain('no-store');
    const body = await health.json();
    expect(body.status).toBe('ok');
    expect(body.service).toBe(service);
    expect(typeof body.release).toBe('string');
  });
}
