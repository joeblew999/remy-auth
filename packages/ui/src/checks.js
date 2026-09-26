// Shared Playwright checks for every app built on this package, so a consumer gets Google's
// checks with the code. Plain JavaScript: Playwright loads helpers from node_modules without
// transpiling. Node's own Intl is the oracle for formatted text; the compiled messages are the
// ones the app renders. Call the factories from a test file and pass the app's public paths.
import { test, expect, chromium } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';
import { locales, baseLocale, localizeUrl, extractLocaleFromHeader } from './paraglide/runtime.js';
import { matchChinese } from './matching.js';

/**
 * The languages whose checks run: every locale, or the comma-separated subset in CHECK_LOCALES
 * (the quick development tier, `project:test:quick`). Checks iterate this; expectations that must
 * hold for every language (sitemap, hreflang, switcher) keep using `locales`.
 */
export const checkedLocales = process.env.CHECK_LOCALES
  ? locales.filter(locale => process.env.CHECK_LOCALES.split(',').map(value => value.trim()).includes(locale))
  : locales;
import { m } from './paraglide/messages.js';
import { samples } from './samples.js';
import { ownValues, choicesFor, choiceKinds } from './locale-data.js';

export const endonym = locale => new Intl.DisplayNames([locale], { type: 'language' }).of(locale);
export const direction = locale => new Intl.Locale(locale).getTextInfo().direction;
export const localizedPath = (path, locale) => localizeUrl(new URL(path || '/', 'http://localhost'), { locale }).pathname;
const weekday = (locale, day, style = 'long') => new Intl.DateTimeFormat(locale, { weekday: style, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));

/**
 * The contract for every formatter on the pages: the locale with its own calendar and digits named
 * explicitly, the first of Intl Locale Info's getCalendars() and getNumberingSystems()
 * (fa → fa-u-ca-persian-nu-arabext). Mirrors locale-info.ts's formatLocale on purpose.
 */
export const formatTag = locale => {
  const tag = new Intl.Locale(locale);
  return new Intl.Locale(locale, { calendar: tag.getCalendars()[0], numberingSystem: tag.getNumberingSystems()[0] }).toString();
};
/** `value` written in a numbering system's digits, e.g. digits(3, 'arabext') is ۳. */
const digits = (value, numberingSystem) => new Intl.NumberFormat('en', { numberingSystem, useGrouping: false }).format(value);
/** The decimal digits in `text` that are not the language's own (Persian text with a Latin 3 gives ['3']). */
export const foreignDigits = (text, locale) => {
  const own = digits(1234567890, new Intl.Locale(locale).getNumberingSystems()[0]);
  return [...text.matchAll(/\p{Nd}/gu)].map(([digit]) => digit).filter(digit => !own.includes(digit));
};

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
 * `oneLanguage` names site pages written in one language only (remy-auth's docs): the sitemap lists
 * each once, in that language, without alternates; every other expectation stays as it is. Its
 * `translations` names, per path, the languages such a page also has its own text in (English first):
 * the sitemap lists it in each of them, self-canonical, with those as alternates and x-default.
 */
export function publicPageChecks({ paths, prerendered = false, oneLanguage = { locale: baseLocale, paths: [] }, sitemap = true }) {
  for (const locale of checkedLocales) {
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
      // Structured data: the site home names the site (schema.org WebSite), once, in the server's HTML.
      const data = page.locator('script[type="application/ld+json"]');
      await expect(data).toHaveCount(1);
      expect(JSON.parse(await data.textContent())).toEqual(website(baseURL));
      await context.close();
    });

    test(`${locale}: the home page's structured data stays single once hydrated`, async ({ page, baseURL }) => {
      // Guards TanStack Router issue #6627: the browser must not add a second copy of the head script.
      await page.goto(localizedPath('', locale));
      await hydrated(page.locator('body'));
      const data = page.locator('script[type="application/ld+json"]');
      await expect(data).toHaveCount(1);
      expect(JSON.parse(await data.textContent())).toEqual(website(baseURL));
    });
  }

  test('unknown paths are 404s', async ({ request }) => {
    for (const path of ['/zz', `${localizedPath('', baseLocale)}/missing`, '/zz/demo']) expect((await request.get(path)).status(), path).toBe(404);
  });

  // An app whose sitemap comes from the seo-routes part runs these with the part's checks instead (sitemap: false).
  if (sitemap) sitemapChecks({ paths, oneLanguage });

  // One test per language, as the other per-language checks; one-language pages once, in their language.
  const narrowCases = [...checkedLocales.map(locale => [locale, paths]), ...(oneLanguage.paths.length ? [[oneLanguage.locale, oneLanguage.paths, 'one-language pages']] : [])];
  for (const [locale, casePaths, what = 'every page'] of narrowCases) test(`${locale}: ${what} mirror the header in right-to-left languages, fit a narrow screen and name only fonts they load`, async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    for (const path of casePaths) {
      await page.goto(localizedPath(path, locale));
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${locale}${path} overflows`).toBe(true);
      // The fonts rule (fonts.css): every named family is one the page loads (@font-face), the rest generic.
      const fonts = await page.evaluate(() => {
        const loaded = new Set([...document.fonts].map(face => face.family.replace(/^["']|["']$/g, '')));
        const generic = new Set(['system-ui', 'sans-serif', 'serif', 'monospace', 'emoji', 'math']);
        const families = [...new Set([document.documentElement, ...document.querySelectorAll('body, body *')]
          .flatMap(element => getComputedStyle(element).fontFamily.split(',')).map(name => name.trim().replace(/^["']|["']$/g, '')))];
        return families.filter(name => !generic.has(name) && !loaded.has(name));
      });
      expect(fonts, `${locale}${path} names fonts it never loads`).toEqual([]);
      const brand = await page.locator('.brand').boundingBox();
      const languages = await page.locator('nav.languages').boundingBox();
      if (direction(locale) === 'rtl') expect(brand.x, `${locale}${path}`).toBeGreaterThan(languages.x);
      else expect(brand.x, `${locale}${path}`).toBeLessThan(languages.x);
    }
  });
}

/**
 * The sitemap lists only localized, self-canonical URLs with hreflang alternates: every site path in
 * every locale, and `oneLanguage`'s pages as publicPageChecks describes; robots.txt names it.
 * publicPageChecks runs these unless told `sitemap: false`; the seo-routes part's checks run them too.
 */
export function sitemapChecks({ paths, oneLanguage = { locale: baseLocale, paths: [] } }) {
  test('the sitemap lists only localized, self-canonical URLs with hreflang alternates', async ({ request, baseURL }) => {
    const sitemap = await request.get('/sitemap.xml');
    expect(sitemap.status()).toBe(200);
    const xml = await sitemap.text();
    const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map(match => match[1]);
    const localized = locales.flatMap(locale => paths.map(path => `${baseURL}${localizedPath(path, locale)}`));
    const langsOf = path => ((oneLanguage.translations?.[path]?.length ?? 0) > 1 ? oneLanguage.translations[path] : [oneLanguage.locale]);
    const single = oneLanguage.paths.filter(path => langsOf(path).length === 1).map(path => `${baseURL}${localizedPath(path, oneLanguage.locale)}`);
    const translated = oneLanguage.paths.filter(path => langsOf(path).length > 1);
    const translatedUrls = translated.flatMap(path => langsOf(path).map(locale => `${baseURL}${localizedPath(path, locale)}`));
    expect([...urls].sort()).toEqual([...localized, ...single, ...translatedUrls].sort());
    for (const url of urls) {
      const response = await request.get(url);
      expect(response.status(), url).toBe(200);
      expect(await response.text(), url).toContain(`<link rel="canonical" href="${url}"`);
    }
    // Every translated page's URL lists each of its languages and x-default once.
    const extra = lang => translated.reduce((sum, path) => sum + (lang === 'x-default' || langsOf(path).includes(lang) ? langsOf(path).length : 0), 0);
    for (const lang of [...locales, 'x-default']) expect(xml.match(new RegExp(`hreflang="${lang}"`, 'g'))?.length ?? 0, lang).toBe(localized.length + extra(lang));
    for (const url of single) expect(xml, url).toContain(`<url><loc>${url}</loc></url>`);
    for (const path of translated) {
      const alternates = [...langsOf(path).map(lang => [lang, lang]), ['x-default', oneLanguage.locale]]
        .map(([lang, locale]) => `<xhtml:link rel="alternate" hreflang="${lang}" href="${baseURL}${localizedPath(path, locale)}"/>`).join('');
      for (const locale of langsOf(path)) expect(xml, `${locale}${path}`).toContain(`<url><loc>${baseURL}${localizedPath(path, locale)}</loc>${alternates}</url>`);
    }
    expect(await (await request.get('/robots.txt')).text()).toContain('/sitemap.xml');
  });
}

/** The schema.org WebSite the site home page carries: the brand and the site root. */
const website = origin => ({ '@context': 'https://schema.org', '@type': 'WebSite', name: 'Remy', url: `${origin}/` });

/**
 * URLs without a locale lead to the visitor's language, and a localized page offers the
 * preferred language without redirecting. `mode` is "redirect" for a server that answers with
 * 302 (Paraglide's middleware) or "static" for prerendered entry pages resolved in the browser.
 */
export function entryChecks({ paths, mode }) {
  if (mode === 'redirect') {
    test("URLs without a language redirect to the visitor's language: remembered choice, Accept-Language, else the base locale", async ({ request, browser, baseURL }) => {
      // A language this project does not serve falls back to the base locale: the first of these
      // that is not configured, so adding languages never turns the case into a supported one.
      const unserved = ['sw-KE', 'nl-NL', 'fi-FI', 'ko-KR', 'vi-VN'].find(tag => !locales.includes(new Intl.Locale(tag).language));
      expect(unserved, 'every candidate language is configured: extend the list').toBeTruthy();
      const cases = [
        [{ 'Accept-Language': 'es-MX,es;q=0.9,en;q=0.8' }, 'es'], [{ 'Accept-Language': 'ar-EG' }, 'ar'],
        [{ 'Accept-Language': `${unserved},${new Intl.Locale(unserved).language};q=0.9` }, baseLocale], [{ 'Accept-Language': '*' }, baseLocale],
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

    // Paraglide's preferredLanguage matches a whole tag or its language only; the custom-chinese
    // strategy (matching.js) adds the script. This runs whatever the locales are: the proof that
    // Traditional Chinese reaches zh-TW is the matcher itself over a list that has zh-TW, and every
    // other language, the URL and the cookie must still get exactly Paraglide's own answer.
    test('the Chinese strategy maps Traditional script to zh-TW and leaves everything else to Paraglide', async ({ request }) => {
      const withTaiwan = [...locales.filter(locale => locale !== 'zh-TW'), 'zh-TW'];
      const matcher = [
        [['zh-Hant-HK'], 'zh-TW'], [['zh-HK'], 'zh-TW'], [['zh-MO', 'en'], 'zh-TW'], [['zh-Hant'], 'zh-TW'],
        [['fr', 'zh-Hant-HK'], 'zh-TW'], [['zh-CN'], undefined], [['zh-Hans-HK'], undefined], [['zh'], undefined],
        [['zh-SG', 'zh-HK'], undefined], [[baseLocale, 'zh-HK'], undefined], [['zh-TW'], undefined], [['not a tag', 'zh-HK'], 'zh-TW'],
      ];
      for (const [tags, expected] of matcher) expect(matchChinese(tags, withTaiwan), tags.join(',')).toBe(expected);
      // Without zh-TW configured the strategy never answers.
      expect(matchChinese(['zh-Hant-HK'], locales.filter(locale => locale !== 'zh-TW'))).toBe(undefined);
      const paraglide = headers => extractLocaleFromHeader(new Request('http://localhost/', { headers })) ?? baseLocale;
      const other = locales.find(locale => locale !== baseLocale && !locale.startsWith('zh')) ?? baseLocale;
      const cases = [
        [{ 'Accept-Language': 'zh-CN,zh;q=0.9' }, paraglide({ 'Accept-Language': 'zh-CN,zh;q=0.9' })],
        [{ 'Accept-Language': `${other},zh-Hant-HK;q=0.9` }, other],
        [{ 'Accept-Language': 'zh-Hant-HK', Cookie: `PARAGLIDE_LOCALE=${other}` }, other],
      ];
      for (const [headers, expected] of cases) for (const path of paths) {
        const response = await request.get(path || '/', { maxRedirects: 0, headers });
        expect(response.status(), `${path} ${JSON.stringify(headers)}`).toBe(302);
        expect(response.headers()['location'], `${path} ${JSON.stringify(headers)}`).toMatch(new RegExp(`${localizedPath(path, expected)}$`));
      }
      // A localized URL always wins over the header.
      const page = await request.get(localizedPath(paths[0], other), { headers: { 'Accept-Language': 'zh-Hant-HK' } });
      expect(await page.text()).toContain(`<html lang="${other}"`);
    });

    // Skipped only while zh-TW is not a configured locale: the end-to-end proof once it is.
    test('Accept-Language zh-Hant-HK reaches zh-TW', async ({ request }) => {
      test.skip(!locales.includes('zh-TW'), 'zh-TW is not a configured locale yet (.plans/hard-localisation.md)');
      for (const language of ['zh-Hant-HK', 'zh-HK', 'zh-TW']) for (const path of paths) {
        const response = await request.get(path || '/', { maxRedirects: 0, headers: { 'Accept-Language': language } });
        expect(response.status(), `${path} ${language}`).toBe(302);
        expect(response.headers()['location'], `${path} ${language}`).toMatch(new RegExp(`${localizedPath(path, 'zh-TW')}$`));
      }
      const simplified = await request.get(paths[0] || '/', { maxRedirects: 0, headers: { 'Accept-Language': 'zh-CN' } });
      expect(simplified.headers()['location']).not.toMatch(new RegExp(`${localizedPath(paths[0], 'zh-TW')}$`));
    });
  } else {
    test("entry URLs are static lists of every language, and the browser moves to the visitor's language", async ({ request, browser, baseURL }) => {
      for (const path of paths) {
        const response = await request.get(path || '/');
        expect(response.status(), path).toBe(200);
        const html = await response.text();
        expect(html).toContain(`<html lang="${baseLocale}"`);
        for (const locale of checkedLocales) expect(html).toContain(`href="${localizedPath(path, locale)}"`);
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

/** Resolves once React has hydrated the element (React attaches its props to hydrated DOM nodes). */
export const hydrated = locator => expect.poll(() => locator.evaluate(node => Object.keys(node).some(key => key.startsWith('__reactProps'))), { message: 'hydrated' }).toBe(true);

/** The interactive demo: the counter, the localized reservation form, and a same-tab language switch. */
export function demoChecks() {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: demo counter, reservation form and language switch work after hydration`, async ({ page, context }) => {
      const errors = collectErrors(page);
      await page.goto(localizedPath('/app/demo', locale));
      // Act once hydrated: before that a prerendered page's buttons have no handlers yet.
      await hydrated(page.getByRole('button', { name: m.increment({}, o), exact: true }));
      await page.getByRole('button', { name: m.increment({}, o), exact: true }).click();
      await expect(page.locator('output')).toHaveText(new Intl.NumberFormat(locale).format(1));
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('#name-error')).toHaveText(m.name_required({}, o));
      await page.getByLabel(m.name_label({}, o), { exact: true }).fill(samples.guest);
      const guests = page.getByLabel(m.guests_label({}, o), { exact: true });
      // The seats start in the language's own digits, and digits of any script are read.
      await expect(guests).toHaveValue(new Intl.NumberFormat(formatTag(locale)).format(2));
      await guests.fill('3');
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('.reserved')).toHaveText(m.reserved({ name: samples.guest, count: 3 }, o));
      expect(foreignDigits(await page.locator('.reserved').innerText(), locale), 'the confirmation writes the seats in the language\'s digits').toEqual([]);
      for (const [value, numberingSystem] of [[4, 'arabext'], [5, 'arab'], [12, 'arabext'], [7, new Intl.Locale(locale).getNumberingSystems()[0]]]) {
        await guests.fill(digits(value, numberingSystem));
        await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
        await expect(page.locator('.reserved'), `${value} in ${numberingSystem} digits`).toHaveText(m.reserved({ name: samples.guest, count: value }, o));
      }
      await guests.fill(digits(21, 'arabext'));
      await page.getByRole('button', { name: m.submit({}, o), exact: true }).click();
      await expect(page.locator('#guests-error')).toHaveText(m.guests_invalid({}, o));
      const other = locales.find(value => value !== locale);
      // App pages switch language through the header's menu (shadcn's DropdownMenu with a radio group).
      await page.getByRole('button', { name: m.language_label({}, o), exact: true }).click();
      await page.getByRole('menuitemradio', { name: endonym(other), exact: true }).click();
      await expect(page).toHaveURL(new RegExp(`${localizedPath('/app/demo', other)}$`));
      await expect(page.locator('html')).toHaveAttribute('lang', other);
      expect(context.pages()).toHaveLength(1);
      expect(errors).toEqual([]);
    });
  }
}

/** The formats page's sections, each opening with what it is for the page's language (data-own-area). */
const formatsAreas = ['language', 'time', 'numbers', 'money', 'words'];

/**
 * The formats page's shared rows match Node's Intl for every locale: language, calendar,
 * digits, clock, week start, dates, numbers, currency, plurals and ordinals. Every section opens
 * with its "for this language" card, and every control offers the page's language's own values
 * first (marked), then every other locale's, all from locale-data.js: a new locale needs no edit
 * here. `extra` checks an app's additional rows.
 */
export function formatsChecks({ extra } = {}) {
  for (const locale of checkedLocales) {
    const o = { locale };
    test(`${locale}: formats page matches this language's Intl output without JavaScript`, async ({ browser, baseURL }) => {
      const context = await browser.newContext({ javaScriptEnabled: false });
      const page = await context.newPage();
      expect((await page.goto(`${baseURL}${localizedPath('/formats', locale)}`))?.status()).toBe(200);
      await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', `${baseURL}${localizedPath('/formats', locale)}`);
      await expect(page.locator('link[hreflang="x-default"]')).toHaveAttribute('href', `${baseURL}/formats`);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.formats_title({}, o));
      // Formatted with the explicit tag (the language's own calendar and digits): the rows written
      // by Paraglide's messages use the plain locale, so they match only if the runtime's defaults
      // are the language's own, which is the claim (a Persian page shows the Persian calendar).
      const format = formatTag(locale);
      const resolved = new Intl.DateTimeFormat(format, { hour: 'numeric' }).resolvedOptions();
      const tag = new Intl.Locale(locale);
      const numbering = tag.getNumberingSystems()[0];
      const { firstDay, weekend } = tag.getWeekInfo();
      const list = new Intl.ListFormat(locale, { type: 'conjunction' });
      const titleWords = [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(m.home_title({}, o))].filter(part => part.isWordLike).map(part => part.segment);
      const expected = {
        tag: locale,
        name: endonym(locale),
        direction: direction(locale) === 'rtl' ? m.direction_rtl({}, o) : m.direction_ltr({}, o),
        languages: new Intl.ListFormat(locale, { type: 'conjunction' }).format(locales.map(endonym)),
        calendar: new Intl.DisplayNames([locale], { type: 'calendar' }).of(tag.getCalendars()[0]),
        numbering: `${numbering} · ${new Intl.NumberFormat(format).format(samples.decimal)}`,
        'hour-cycle': ['h11', 'h12'].includes(resolved.hourCycle ?? '') ? m.hour_cycle_12({}, o) : m.hour_cycle_24({}, o),
        'week-start': weekday(locale, firstDay),
        weekend: list.format(weekend.map(day => weekday(locale, day))),
        instant: new Intl.DateTimeFormat(format, { dateStyle: 'full', timeStyle: 'long', timeZone: 'UTC' }).format(samples.instant),
        date: new Intl.DateTimeFormat(format, { dateStyle: 'long', timeZone: 'UTC' }).format(samples.date),
        relative: new Intl.RelativeTimeFormat(format, { numeric: 'auto' }).format(samples.days, 'day'),
        decimal: new Intl.NumberFormat(format).format(samples.decimal),
        percent: new Intl.NumberFormat(format, { style: 'percent' }).format(samples.share),
        compact: new Intl.NumberFormat(format, { notation: 'compact' }).format(samples.big),
        currency: new Intl.NumberFormat(format, { style: 'currency', currency: ownValues(locale).currency }).format(samples.amount),
        'plural-forms': list.format(ownValues(locale).counts.map(count => m.apps_count({ count }, o))),
        casing: samples.casing,
        'word-count': new Intl.NumberFormat(format).format(titleWords.length),
        'long-word': samples.longWord,
      };
      for (const [sample, text] of Object.entries(expected)) await expect(page.locator(`[data-sample="${sample}"]`), sample).toHaveText(text);
      for (const count of samples.counts) await expect(page.locator(`[data-count="${count}"]`)).toHaveText(m.apps_count({ count }, o));
      for (const n of samples.positions) await expect(page.locator(`[data-position="${n}"]`)).toHaveText(m.position_value({ n }, o));
      // Counts and positions inside sentences use the language's own digits too, as the number rows do.
      for (const node of await page.locator('[data-count], [data-position]').all()) expect(foreignDigits(await node.innerText(), locale), await node.innerText()).toEqual([]);
      // The week in this locale's order from its first day, its weekend marked (Intl Locale Info's getWeekInfo).
      const days = Array.from({ length: 7 }, (_, index) => ((firstDay - 1 + index) % 7) + 1);
      await expect(page.locator('[data-weekday]')).toHaveText(days.map(day => weekday(locale, day, 'short')));
      expect(await page.locator('[data-weekday]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.weekday)))).toEqual(days);
      expect(await page.locator('[data-weekend]').evaluateAll(nodes => nodes.map(node => Number(node.dataset.weekday)))).toEqual(days.filter(day => weekend.includes(day)));
      // Words as Intl.Segmenter divides them, also for languages written without spaces.
      await expect(page.locator('[data-word]')).toHaveText(titleWords);
      // Every section opens with its "for this language" card.
      for (const area of formatsAreas) await expect(page.locator(`section#${area} > div.grid > :first-child`), area).toHaveAttribute('data-own-area', area);
      // Every control: this language's own values first and marked, then every other locale's, as links (static labels on a prerendered page) without JavaScript.
      for (const kind of choiceKinds) {
        const { own, others } = choicesFor(locale, kind);
        const items = page.locator(`[data-choices="${kind}"] li`);
        expect(await items.evaluateAll(nodes => nodes.map(node => node.dataset.choiceValue)), kind).toEqual([...own, ...others].map(String));
        expect(await items.evaluateAll(nodes => nodes.filter(node => node.hasAttribute('data-own')).map(node => node.dataset.choiceValue)), kind).toEqual(own.map(String));
      }
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
  // npx --no-install finds the pinned binary from any workspace (a docs app's bins are hoisted to the root).
  const cli = (...args) => execFileSync('npx', ['--no-install', 'chrome-devtools', ...args],
    { encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' }, timeout: 120_000 });
  test.describe('lighthouse', () => {
    test.describe.configure({ mode: 'serial', timeout: 120_000 });
    test.beforeAll(() => { cli('start', '--isolated', '--headless', '--no-usage-statistics', '--no-performance-crux'); });
    test.afterAll(() => { cli('stop'); });
    for (const { path, device } of pages) {
      test(`${device}: ${path} passes every audit`, async ({ baseURL }, testInfo) => {
        const dir = testInfo.outputPath('lighthouse');
        rmSync(dir, { recursive: true, force: true });
        if (process.env.COLOR_SCHEME) cli('emulate', '1', '--colorScheme', process.env.COLOR_SCHEME);
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
 * 0.9; every failing audit is in the attached report. One run varies by hundreds of milliseconds, so
 * each page runs `runs` times and Lighthouse's own computeMedianRun picks the run that is judged, as
 * Lighthouse's variability guidance advises (github.com/GoogleChrome/lighthouse/blob/main/docs/variability.md).
 * Call it from tests/performance.spec.ts, which
 * the shared Playwright config runs alone after all other checks. Tighten `thresholds` per project if needed.
 */
export function performanceChecks({ pages, thresholds = {}, runs = 5 }) {
  const limits = { score: 0.9, lcp: 2500, cls: 0.1, tbt: 200, ...thresholds };
  test.describe('core web vitals', () => {
    test.describe.configure({ mode: 'serial', timeout: 600_000 });
    const port = 9222 + Math.floor(Math.random() * 1000);
    let browser, puppeteerBrowser;
    test.beforeAll(async () => {
      browser = await chromium.launch({ channel: 'chrome', args: [`--remote-debugging-port=${port}`] });
      // Lighthouse bundles puppeteer-core; connecting it to the same Chrome lets Lighthouse drive a
      // fresh page. Never warm the page first: a visitor's first load in a new tab is cold, and a
      // warm-up once hid a multi-second font stall that real visitors paid.
      const puppeteer = await import('puppeteer-core');
      puppeteerBrowser = await puppeteer.default.connect({ browserURL: `http://127.0.0.1:${port}` });
    });
    test.afterAll(async () => { await puppeteerBrowser?.disconnect(); await browser?.close(); });
    for (const { path, device } of pages) {
      test(`${device}: ${path} meets Google's good thresholds`, async ({ baseURL }, testInfo) => {
        const { navigation, desktopConfig, generateReport } = await import('lighthouse');
        const { computeMedianRun } = await import('lighthouse/core/lib/median-run.js');
        const lhrs = [];
        for (let run = 0; run < runs; run++) {
          const page = await puppeteerBrowser.newPage();
          const result = await navigation(page, `${baseURL}${path}`, {
            flags: { output: 'json', logLevel: 'error', onlyCategories: ['performance'] },
            config: device === 'desktop' ? desktopConfig : undefined,
          });
          await page.close();
          lhrs.push(result.lhr);
        }
        const lhr = computeMedianRun(lhrs);
        await testInfo.attach('runs.txt', { body: lhrs.map(run => `LCP ${Math.round(run.audits['largest-contentful-paint'].numericValue)} ms, score ${run.categories.performance.score}`).join('\n'), contentType: 'text/plain' });
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

/**
 * The two kinds of page stay apart (paths.js): every site page is complete in the server's HTML
 * without JavaScript, indexable and labelled as a site page; every app page carries noindex, stays
 * out of the sitemap and is labelled as the app once it runs.
 */
export function zoneChecks({ sitePaths, appPaths }) {
  // One test per language, as the other per-language checks: the work grows with the language count.
  for (const locale of checkedLocales) test(`${locale}: site pages work without JavaScript, are indexable and say so`, async ({ browser }) => {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const page = await context.newPage();
    for (const path of sitePaths) {
      const url = localizedPath(path, locale);
      expect((await page.goto(url))?.status(), url).toBe(200);
      await expect(page.getByRole('heading', { level: 1 }), url).toBeVisible();
      await expect(page.locator('[data-zone="site"]'), url).toHaveText(m.zone_site({}, { locale }));
      await expect(page.locator('meta[name="robots"]'), url).toHaveCount(0);
      // Structured data belongs to the site home page only (publicPageChecks).
      if (path !== '') await expect(page.locator('script[type="application/ld+json"]'), url).toHaveCount(0);
    }
    await context.close();
  });

  // One test per language, as the other per-language checks: the work grows with the language count.
  for (const locale of checkedLocales) {
    test(`${locale}: app pages are kept out of search and say they are the app`, async ({ page, request }) => {
      const sitemap = await (await request.get('/sitemap.xml')).text();
      for (const path of appPaths) {
        const url = localizedPath(path, locale);
        const response = await request.get(url);
        expect(response.status(), url).toBe(200);
        const html = await response.text();
        // TanStack Router puts the request's CSP nonce, when there is one, on every head tag it renders.
        expect(html, url).toMatch(/<meta name="robots" content="noindex"(?: nonce="[^"]+")?\/>/);
        expect(html, url).not.toContain('application/ld+json');
        expect(sitemap, url).not.toContain(`${url}<`);
        await page.goto(url);
        await expect(page.locator('[data-zone="app"]'), url).toHaveText(m.zone_app({}, { locale }));
      }
    });
  }

  test('on a phone in landscape the way back to the site stays in view', async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 340 });
    for (const locale of checkedLocales) {
      await page.goto(localizedPath(appPaths[0], locale));
      await expect(page.getByRole('link', { name: m.back_to_site({}, { locale }), exact: true })).toBeInViewport();
    }
  });
}

/** Observability every Worker built on this package must show: a request ID on every response and a liveness route. */
export function observabilityChecks({ service, paths }) {
  test(`every response carries a request ID, the permissions policy and the static security headers, and /healthz answers for ${service}`, async ({ request }) => {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
    const seen = new Set();
    for (const path of [...locales.flatMap(locale => paths.map(p => localizedPath(p, locale))), '/zz', '/robots.txt', '/sitemap.xml']) {
      const response = await request.get(path, { maxRedirects: 0 });
      const id = response.headers()['x-request-id'];
      expect(id, path).toMatch(uuid);
      expect(response.headers()['permissions-policy'], path).toBe('geolocation=(self), camera=(), microphone=()');
      expect(response.headers()['content-security-policy'], path).toContain("frame-ancestors 'none'");
      expect(response.headers()['cross-origin-opener-policy'], path).toBe('same-origin-allow-popups');
      // A year, after days of HTTPS only (2026-09-26); no includeSubDomains on a shared workers.dev domain.
      expect(Number(/^max-age=(\d+)$/.exec(response.headers()['strict-transport-security'] ?? '')?.[1] ?? 0), path).toBeGreaterThanOrEqual(31536000);
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

/**
 * A strict nonce-based Content Security Policy, enforced unless the app passes `enforce: false`
 * (report-only): every page's response, and the not-found page's, names a fresh nonce in one policy under that mode's header
 * and in none under the other, every script the server renders carries that nonce, and the page
 * loads and hydrates without one violation. Enforced, a script without the nonce does not run and
 * is reported. Data blocks (application/ld+json) are not scripts to CSP, and TanStack renders them
 * without one. The report endpoint takes both report formats and answers 204, in either mode.
 */
export function cspChecks({ paths, reportPath = '/csp-report', enforce = true }) {
  const header = enforce ? 'content-security-policy' : 'content-security-policy-report-only';
  const other = enforce ? 'content-security-policy-report-only' : 'content-security-policy';
  // The nonce policies a response sends under one header name, whether as repeated headers or one
  // comma-joined value (withObservability appends its own frame-ancestors policy to the enforced header).
  const noncePolicies = (response, name) => response.headersArray().filter(entry => entry.name.toLowerCase() === name)
    .flatMap(entry => entry.value.split(',')).map(policy => policy.trim()).filter(policy => policy.includes("'nonce-"));

  test(`every script in a server-rendered page carries the response's CSP nonce, and the ${enforce ? 'enforced' : 'report-only'} policy names it`, async ({ request }) => {
    const seen = new Set();
    // Every page, and the not-found page: its scripts carry the nonce too, so it needs the policy as much.
    const pages = [...paths.map(path => ({ path, status: 200 })), { path: '/zz', status: 404 }];
    for (const locale of checkedLocales) for (const { path, status } of pages) {
      const url = localizedPath(path, locale);
      const response = await request.get(url);
      expect(response.status(), url).toBe(status);
      const named = noncePolicies(response, header);
      expect(named, `${url}: one nonce policy under ${header}`).toHaveLength(1);
      expect(noncePolicies(response, other), `${url}: no nonce policy under ${other}`).toEqual([]);
      const policy = named[0];
      const nonce = policy.match(/'nonce-([A-Za-z0-9+/=]+)'/)?.[1];
      expect(nonce, `${url}: ${policy}`).toBeTruthy();
      expect(policy, url).toBe(`script-src 'nonce-${nonce}' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none'; report-uri ${reportPath}; report-to csp`);
      expect(response.headers()['reporting-endpoints'], url).toBe(`csp="${reportPath}"`);
      expect(seen.has(nonce), `${url} reused a nonce`).toBe(false);
      seen.add(nonce);
      const scripts = [...(await response.text()).matchAll(/<script\b[^>]*>/g)].map(match => match[0])
        .filter(tag => !/\btype="(?!module"|text\/javascript")[^"]*"/.test(tag));
      expect(scripts.length, url).toBeGreaterThan(0);
      for (const tag of scripts) expect(tag, url).toContain(` nonce="${nonce}"`);
    }
  });

  if (enforce) test('the enforced policy blocks a script without the nonce, and reports it', async ({ page }) => {
    const url = localizedPath(paths[0], checkedLocales[0]);
    // The page as served, its headers untouched, with one parser-inserted inline script the server never renders.
    await page.route(target => new URL(target).pathname === url, async route => {
      const response = await route.fetch();
      await route.fulfill({ response, body: (await response.text()).replace('</body>', '<script>window.__unNonced = true</script></body>') });
    });
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(`${event.effectiveDirective} ${event.disposition}`));
    });
    await page.goto(url);
    await hydrated(page.locator('body'));
    expect(await page.evaluate(() => window.__unNonced ?? false), url).toBe(false);
    expect(await page.evaluate(() => window.__cspViolations), url).toEqual(['script-src-elem enforce']);
  });

  // One test per language, as the other per-language checks: the work grows with the language count.
  for (const locale of checkedLocales) test(`${locale}: every page loads and hydrates without a single violation of that policy`, async ({ page }) => {
    await page.addInitScript(() => {
      window.__cspViolations = [];
      document.addEventListener('securitypolicyviolation', event => window.__cspViolations.push(`${event.effectiveDirective} ${event.blockedURI} ${event.sourceFile}:${event.lineNumber}`));
    });
    for (const path of paths) {
      const url = localizedPath(path, locale);
      await page.goto(url);
      await hydrated(page.locator('body'));
      await page.waitForLoadState('networkidle');
      expect(await page.evaluate(() => window.__cspViolations), url).toEqual([]);
    }
  });

  test('the CSP report endpoint takes both report formats and only POST', async ({ request }) => {
    const reports = [{ type: 'csp-violation', url: 'http://localhost/en', body: { documentURL: 'http://localhost/en', blockedURL: 'inline', effectiveDirective: 'script-src-elem', disposition: 'report' } }];
    expect((await request.post(reportPath, { data: JSON.stringify(reports), headers: { 'Content-Type': 'application/reports+json' } })).status()).toBe(204);
    const legacy = { 'csp-report': { 'document-uri': 'http://localhost/en', 'blocked-uri': 'inline', 'effective-directive': 'script-src-elem', disposition: 'report' } };
    expect((await request.post(reportPath, { data: JSON.stringify(legacy), headers: { 'Content-Type': 'application/csp-report' } })).status()).toBe(204);
    expect((await request.post(reportPath, { data: 'not json', headers: { 'Content-Type': 'application/csp-report' } })).status()).toBe(400);
    const get = await request.get(reportPath);
    expect(get.status()).toBe(405);
    expect(get.headers()['allow']).toBe('POST');
  });
}

/**
 * Text in every language on every page (text.css): no page is wider than a 320 px screen, long
 * words hyphenate by the page's language (and break where there is no dictionary), capitals are
 * set in the page's language (so Turkish gets İ from i), and Japanese headings break between
 * phrases. The Turkish and Japanese rules are also proven on the existing languages by switching
 * the page's lang in place.
 */
export function textChecks({ paths }) {
  // One test per language, as the other per-language checks: the work grows with the language count.
  for (const locale of checkedLocales) test(`${locale}: every page fits 320 px; text hyphenates and capitalises by the page language`, async ({ page }) => {
    await page.setViewportSize({ width: 320, height: 640 });
    for (const path of paths) {
      const url = localizedPath(path, locale);
      await page.goto(url);
      await expect(page.getByRole('heading', { level: 1 }), url).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), `${url} overflows 320 px`).toBe(true);
      expect(await page.evaluate(() => {
        const style = getComputedStyle(document.querySelector('h1'));
        return { lang: document.documentElement.lang, hyphens: style.hyphens, wrap: style.overflowWrap };
      }), url).toEqual({ lang: locale, hyphens: 'auto', wrap: 'break-word' });
      // Every element capitalised by CSS takes its casing rules from the page's language.
      expect(await page.evaluate(lang => [...document.querySelectorAll('body *')]
        .filter(node => getComputedStyle(node).textTransform === 'uppercase' && node.closest('[lang]')?.getAttribute('lang') !== lang)
        .map(node => node.outerHTML.slice(0, 120)), locale), `${url} capitalises outside its language`).toEqual([]);
      const casing = page.locator('[data-sample="casing"]');
      if (await casing.count()) {
        expect(await casing.innerText(), url).toBe(samples.casing.toLocaleUpperCase(locale));
        const inTurkish = await page.evaluate(() => { document.documentElement.lang = 'tr'; return document.querySelector('[data-sample="casing"]').innerText; });
        expect(inTurkish, `${url} with lang=tr`).toBe(samples.casing.toLocaleUpperCase('tr'));
        const japanese = await page.evaluate(() => { document.documentElement.lang = 'ja'; return getComputedStyle(document.querySelector('h1')).wordBreak; });
        expect(japanese, `${url} with lang=ja`).toBe('auto-phrase');
        const own = await page.evaluate(lang => { document.documentElement.lang = lang; return getComputedStyle(document.querySelector('h1')).wordBreak; }, locale);
        expect(own, url).toBe(locale.startsWith('ja') ? 'auto-phrase' : 'normal');
      }
    }
  });
}

/** A family name as the rendered font reports it: 'Noto Sans JP Variable' and 'NotoSansJP-Regular' both start notosansjp. */
const fontKey = name => name.toLowerCase().replace(/ variable$/, '').replace(/[^a-z0-9]/g, '');
/** The web fonts an element's stack names (fonts.css): not fontaine's '… fallback' faces, not generic families. */
const namedFonts = family => family.split(',').map(name => name.trim().replace(/^["']|["']$/g, ''))
  .filter(name => name && !name.endsWith(' fallback') && !['serif', 'sans-serif', 'monospace', 'system-ui', 'cursive', 'fantasy'].includes(name));
// Only a web font the page loaded counts (isCustomFont): a system-installed Noto must not pass as ours.
const drawnBy = (font, name) => font.glyphCount > 0 && font.isCustomFont && [font.familyName, font.postScriptName].some(real => real && fontKey(real).startsWith(fontKey(name)));

/**
 * The scripts fonts.css leaves to the system's font on purpose: Han. Their web fonts measured 351 KB
 * (/ja) to 1,176 KB (/zh-TW/formats) on a first visit, over fontBudget (.plans/fonts.md, step 1), and
 * every desktop and phone system ships a Japanese and a Traditional Chinese font that Chrome picks
 * by the page's lang. Any other script still needs its web font: a new Greek or Korean page fails.
 */
const hanScripts = ['Jpan', 'Hant', 'Hans'];
export const systemFontScripts = hanScripts;
/** macOS draws a character no font has with LastResort (a box): tofu, never a system font that passes. */
const tofu = font => [font.familyName, font.postScriptName].some(name => name && fontKey(name).startsWith('lastresort'));
// A system font passes only for a script fonts.css leaves to the system, and never as tofu.
const drawnBySystem = (font, script) => font.glyphCount > 0 && !font.isCustomFont && systemFontScripts.includes(script) && !tofu(font);
/**
 * The most font bytes (resource timing's encodedBodySize) a first visit to one site page may
 * download, in every language. Measured 2026-09-26 on a local production build: 28.7 KB (Latin) to
 * 227.2 KB (/ar/formats); 300 KB leaves about a third of headroom and fails any Han web font
 * (351 KB for /ja, 1,176 KB for /zh-TW/formats). Raise it only with new numbers in .plans/fonts.md.
 */
export const fontBudget = 300 * 1024;
const kb = bytes => `${(bytes / 1024).toFixed(1)} KB`;
const fontFile = /\.(woff2?|ttf|otf)$/;

/**
 * The fonts that actually draw each page's text (fonts.css), read from Chrome with the DevTools
 * Protocol's CSS.getPlatformFontsForNode: the heading and intro in every language are drawn only
 * by the fonts fonts.css names for that language (Geist, then the script's font), and the script
 * font draws some of it; a Han page (systemFontScripts) may be drawn by the system's font for its
 * language, never by tofu. Any other system or fallback font drawing the text fails with the page's
 * script named (Intl.Locale's maximize().script), so a new language whose script has no font says
 * which font to add. Japanese and Traditional Chinese share Han code points with different glyph
 * shapes, so each Han language must be drawn by a font of its own. A first visit to each page
 * downloads at most `budget` bytes of fonts (fontBudget), in every language.
 */
export function fontChecks({ paths, selectors = ['h1', 'h1 + p'], budget = fontBudget }) {
  for (const locale of checkedLocales) test(`${locale}: the page's text is drawn by the fonts fonts.css names for its script`, async ({ page }) => {
    const script = new Intl.Locale(locale).maximize().script;
    const cdp = await page.context().newCDPSession(page);
    for (const path of paths) {
      const url = localizedPath(path, locale);
      await page.goto(url);
      await page.evaluate(() => document.fonts.ready);
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const problems = async () => {
        const found = [];
        let matched = 0;
        for (const selector of selectors) {
          const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector });
          if (!nodeId) continue;
          matched++;
          const named = namedFonts(await page.locator(selector).first().evaluate(node => getComputedStyle(node).fontFamily));
          const { fonts } = await cdp.send('CSS.getPlatformFontsForNode', { nodeId });
          for (const font of fonts) if (font.glyphCount > 0 && !named.some(name => drawnBy(font, name)) && !drawnBySystem(font, script))
            found.push(`${selector} drawn by ${font.familyName} (${font.glyphCount} glyphs${font.isCustomFont ? '' : ', system font'}${tofu(font) ? ', tofu' : ''}), not by ${named.join(' or ')}: fonts.css needs the font for script ${script} in ${locale}'s stack, before any fallback`);
          for (const name of named.slice(1)) if (!fonts.some(font => drawnBy(font, name)))
            found.push(`${selector}: ${name} is named for ${locale} (${script}) but draws nothing`);
        }
        if (matched === 0) found.push(`none of ${selectors.join(', ')} is on the page: nothing was checked`);
        return found;
      };
      await expect.poll(problems, { message: `${url}: the fonts drawing ${locale} (${script})`, timeout: 15_000 }).toEqual([]);
    }
  });

  // A first visit: a fresh context per page, so nothing comes from the cache; every font file counted.
  for (const locale of checkedLocales) test(`${locale}: a first visit to each page downloads at most ${kb(budget)} of fonts`, async ({ browser }) => {
    for (const path of paths) {
      const url = localizedPath(path, locale);
      const context = await browser.newContext();
      const page = await context.newPage();
      await page.goto(url, { waitUntil: 'networkidle' });
      await page.evaluate(() => document.fonts.ready);
      const files = (await page.evaluate(() => performance.getEntriesByType('resource')
        .map(entry => ({ file: new URL(entry.name).pathname.split('/').pop(), bytes: entry.encodedBodySize }))))
        .filter(({ file }) => fontFile.test(file));
      await context.close();
      const total = files.reduce((sum, { bytes }) => sum + bytes, 0);
      expect(total, `${url} (${new Intl.Locale(locale).maximize().script}) downloads ${kb(total)} of fonts, over ${kb(budget)}: ${files.map(({ file, bytes }) => `${file} ${kb(bytes)}`).join(', ')}`).toBeLessThanOrEqual(budget);
    }
  });

  // Han: Japanese and Traditional Chinese draw the same code points with different glyphs, so each needs its own font.
  const han = locales.filter(locale => hanScripts.includes(new Intl.Locale(locale).maximize().script));
  if (han.length > 1 && checkedLocales.some(locale => han.includes(locale))) test(`${han.join(', ')}: each Han language is drawn by a font of its own`, async ({ page }) => {
    const cdp = await page.context().newCDPSession(page);
    const fonts = {};
    for (const locale of han) {
      await page.goto(localizedPath(paths[0], locale));
      await page.evaluate(() => document.fonts.ready);
      const latin = namedFonts(await page.locator('h1').evaluate(node => getComputedStyle(node).fontFamily))[0];
      await cdp.send('DOM.enable');
      await cdp.send('CSS.enable');
      const { root } = await cdp.send('DOM.getDocument');
      const { nodeId } = await cdp.send('DOM.querySelector', { nodeId: root.nodeId, selector: 'h1' });
      // The font drawing most of the heading besides the Latin one: the Han font, web or system.
      const [most] = (await cdp.send('CSS.getPlatformFontsForNode', { nodeId })).fonts
        .filter(font => font.glyphCount > 0 && !drawnBy(font, latin) && !tofu(font)).sort((a, b) => b.glyphCount - a.glyphCount);
      fonts[locale] = most?.familyName ?? '';
    }
    for (const locale of han) {
      expect(fonts[locale], `${locale}: no Han font draws the heading`).not.toBe('');
      expect(han.filter(other => other !== locale && fonts[other] === fonts[locale]), `${locale} shares ${fonts[locale]} with another Han language`).toEqual([]);
    }
  });
}
