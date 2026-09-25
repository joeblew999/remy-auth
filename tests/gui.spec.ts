import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { locales } from '@joeblew999/remy-ui/runtime';
import { samples } from '@joeblew999/remy-ui/samples';
import { checkedLocales, zoneChecks, publicPageChecks, entryChecks, demoChecks, formatsChecks, textChecks, observabilityChecks, cspChecks, collectErrors, endonym, direction, localizedPath, formatTag } from '@joeblew999/remy-ui/checks';
import { localeInfo } from '../packages/ui/src/locale-info';
import { sitePaths, appPaths, allPaths } from '@joeblew999/remy-ui/paths';
import { appPagePaths, docsPaths, everyPath, siteAndDocsPaths } from '../src/paths';
import { searchParamsChecks } from '@joeblew999/remy-ui/showcase/search-params.checks';
import { preloadChecks } from '@joeblew999/remy-ui/showcase/preload.checks';
import { navigationBlockingChecks } from '@joeblew999/remy-ui/showcase/navigation-blocking.checks';
import { apiChecks, reservationApiChecks } from '@joeblew999/remy-ui/api/checks';
import { info } from '@joeblew999/remy-auth-contract';
import { router } from '../src/api/router';
import { docsI18nDir, docsLangs, docsPath, docsTable } from '../src/docs/table.js';
import { deferredPlaceChecks } from '@joeblew999/remy-ui/showcase/deferred-place.checks';
import { statusCardChecks } from '@joeblew999/remy-ui/showcase/status-card.checks';
import { problemChecks } from '@joeblew999/remy-ui/showcase/problem.checks';
import { partChecks } from '@joeblew999/remy-ui/parts/checks';
import { codeSplittingChecks } from '@joeblew999/remy-ui/showcase/code-splitting.checks';
import { buildBoundaryChecks } from '@joeblew999/remy-ui/showcase/build-boundaries.checks';
import { devicePlaceChecks } from '@joeblew999/remy-ui/showcase/device-place.checks';

// The shared checks cover what every app built on the package must satisfy.
// Site pages (for Google) and app pages (for people using the app) never mix; see paths.js.
// This app adds the docs (site pages in English and their translations, docs/i18n/) and the answer page
// (an app page): src/paths.ts.
zoneChecks({ sitePaths: siteAndDocsPaths, appPaths: appPagePaths });
const translations = Object.fromEntries(docsTable.map(row => [docsPath(row.slug), docsLangs(row, readdirSync(docsI18nDir), existsSync)]));
publicPageChecks({ paths: sitePaths, oneLanguage: { locale: 'en', paths: docsPaths, translations } });
// Text in every language: the shared pages (the docs are English only).
textChecks({ paths: allPaths });
entryChecks({ paths: everyPath, mode: 'redirect' });
demoChecks();
// The demo reservation and the status card are contract endpoints (@joeblew999/remy-auth-contract).
apiChecks({ router, title: info.title });
reservationApiChecks();
codeSplittingChecks({ paths: [...sitePaths, '/docs'] });
codeSplittingChecks({ paths: appPaths, home: '/app' });
// The app mounts TanStack Devtools (src/routes/__root.tsx), whose shell must never ship either.
buildBoundaryChecks({ paths: everyPath, markers: [
  { name: 'request.cf', pattern: /\.cf\b/, source: 'src/place.server.ts' },
  { name: 'TanStack Devtools (the shell hosting the panels)', pattern: /tsd-(?:control|surface)\b/, source: { package: '@tanstack/devtools', from: '@tanstack/react-devtools' } },
] });
observabilityChecks({ service: 'remy-auth', paths: everyPath });
cspChecks({ paths: everyPath });
searchParamsChecks();
preloadChecks();
navigationBlockingChecks();
deferredPlaceChecks();
devicePlaceChecks({ path: '/app/location', network: true });
statusCardChecks({ service: 'remy-auth', path: '/app', endpoint: '/api/status' });
// Every part listed in src/parts.json brings its own checks.
partChecks();
problemChecks({ failingNavigation: { from: '', link: 'formats_link', fail: '**/_serverFn/**', heading: 'formats_title' }, serverRoutes: [{ path: '/robots.txt', type: 'text/plain; charset=utf-8', cache: 'public, max-age=3600, s-maxage=3600', origin: true }, { path: '/sitemap.xml', type: 'application/xml; charset=utf-8', cache: 'public, max-age=3600, s-maxage=3600', origin: true }] });
formatsChecks({ extra: async (page, locale) => {
  // Rows only this server-rendered app has: more Intl examples and Cloudflare's geolocation.
  const messages = catalogs[locale];
  const info = localeInfo(locale as any);
  const list = new Intl.ListFormat(locale, { type: 'conjunction' });
  const format = formatTag(locale);
  const expected: Record<string, string> = {
    region: new Intl.DisplayNames([locale], { type: 'region' }).of(info.region)!,
    'currency-name': new Intl.DisplayNames([locale], { type: 'currency' }).of(info.currency)!,
    range: new Intl.DateTimeFormat(format, { dateStyle: 'medium', timeZone: 'UTC' }).formatRange(samples.rangeStart, samples.rangeEnd),
    distance: new Intl.NumberFormat(locale, { style: 'unit', unit: 'kilometer', unitDisplay: 'long' }).format(samples.km),
    currencies: list.format(samples.currencies.map(currency => new Intl.NumberFormat(format, { style: 'currency', currency }).format(samples.amount))),
    sorted: list.format([...samples.names].sort(new Intl.Collator(locale).compare)),
    greeting: messages.greeting.replace('{name}', samples.guest),
    ...Object.fromEntries(samples.statuses.map(status => [`status-${status}`, messages.invite_status[0].match[`status=${status}`] ?? messages.invite_status[0].match['status=*']])),
  };
  for (const [sample, text] of Object.entries(expected)) await expect(page.locator(`[data-sample="${sample}"]`), sample).toHaveText(text);
  if (info.otherCalendars.length === 0) await expect(page.locator('[data-sample="other-calendars"]')).toHaveText(messages.no_other_calendars);
  for (const calendar of info.otherCalendars) {
    await expect(page.locator(`[data-calendar="${calendar}"]`), calendar).toHaveText(
      `${new Intl.DisplayNames([locale], { type: 'calendar' }).of(calendar)}: ${new Intl.DateTimeFormat(format, { ...samples.calendarDate, calendar }).format(samples.date)}`);
  }
  // Cloudflare's geolocation depends on where the request comes from; the page exposes what it used.
  const zone = await page.locator('[data-sample="cf-timezone"]').getAttribute('data-timezone');
  await expect(page.locator('[data-sample="cf-timezone"]')).toHaveText(zone || messages.location_unknown);
  await expect(page.locator('[data-sample="cf-local"]')).toHaveText(zone
    ? new Intl.DateTimeFormat(format, { dateStyle: 'full', timeStyle: 'long', timeZone: zone }).format(samples.instant) : messages.location_unknown);
  const country = await page.locator('[data-sample="country"]').getAttribute('data-country');
  await expect(page.locator('[data-sample="country"]')).toHaveText(country ? new Intl.DisplayNames([locale], { type: 'region' }).of(country)! : messages.location_unknown);
} });

// Checks that belong to this repository: the catalogs it owns, and server rendering itself.
const settings = JSON.parse(readFileSync('packages/ui/project.inlang/settings.json', 'utf8'));
const baseLocale: string = settings.baseLocale;
const catalogs: Record<string, Record<string, any>> = Object.fromEntries(
  (settings.locales as string[]).map(locale => [locale, JSON.parse(readFileSync(`packages/ui/messages/${locale}.json`, 'utf8'))]));
test.use({ timezoneId: 'Asia/Tokyo' });

test('every catalog matches the base catalog and covers its plural categories', () => {
  const base = catalogs[baseLocale];
  for (const locale of settings.locales as string[]) {
    const catalog = catalogs[locale];
    expect(Object.keys(catalog).sort(), locale).toEqual(Object.keys(base).sort());
    for (const [key, value] of Object.entries(base)) {
      const other = catalog[key];
      if (typeof value === 'string') {
        expect(typeof other, `${locale}.${key}`).toBe('string');
        expect(other.trim(), `${locale}.${key}`).not.toBe('');
        expect(other.match(/\{\w+\}/g) ?? [], `${locale}.${key}`).toEqual(value.match(/\{\w+\}/g) ?? []);
      } else {
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

test('concurrent server renders retain their requested language and direction', async ({ request }) => {
  await Promise.all(Array.from({ length: 6 * locales.length }, async (_, index) => {
    const locale = locales[index % locales.length];
    const other = locales[(index + 1) % locales.length];
    const response = await request.get(localizedPath('/formats', locale), { headers: { 'Accept-Language': other } });
    expect(response.status()).toBe(200);
    const html = await response.text();
    expect(html).toContain(`<html lang="${locale}" dir="${direction(locale)}"`);
    expect(html).toContain(catalogs[locale].formats_title);
    expect(html).toContain(new Intl.NumberFormat(formatTag(locale), { style: 'currency', currency: localeInfo(locale as any).currency }).format(samples.amount));
  }));
});

test('formats page hydrates in every language without errors and fills the device time zone', async ({ page }) => {
  const errors = collectErrors(page);
  for (const locale of checkedLocales) {
    await page.goto(localizedPath('/formats', locale));
    await page.waitForLoadState('networkidle');
    await expect(page.locator('html')).toHaveAttribute('dir', direction(locale));
    await expect(page.locator('[data-sample="currency"]')).toHaveText(new Intl.NumberFormat(formatTag(locale), { style: 'currency', currency: localeInfo(locale as any).currency }).format(samples.amount));
    await expect(page.locator('[data-sample="local"]')).toHaveText(new Intl.DateTimeFormat(locale, { dateStyle: 'full', timeStyle: 'long', timeZone: 'Asia/Tokyo' }).format(samples.instant));
  }
  expect(errors).toEqual([]);
  expect(endonym('en')).toBe('English');
});
