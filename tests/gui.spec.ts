import { test, expect, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { locales } from '@joeblew999/remy-ui/runtime';
import { samples } from '@joeblew999/remy-ui/samples';
import { checkedLocales, collectErrors, endonym, direction, localizedPath, formatTag } from '@joeblew999/remy-ui/checks';
import { serverAppChecks } from '@joeblew999/remy-ui/app-checks';
import { localeInfo } from '../packages/ui/src/locale-info';
import { sitePaths, appPaths } from '@joeblew999/remy-ui/paths';
import { everyPath } from '../src/paths';
import { cspEnforced } from '../src/csp';
import { apiChecks, reservationApiChecks } from '@joeblew999/remy-ui/api/checks';
import { info } from '@joeblew999/remy-auth-contract';
import { router } from '../src/api/router';
import { registeredOrigins } from '../src/api/origins';
import { partChecks } from '@joeblew999/remy-ui/parts/checks';
import { codeSplittingChecks } from '@joeblew999/remy-ui/showcase/code-splitting.checks';
import { buildBoundaryChecks } from '@joeblew999/remy-ui/showcase/build-boundaries.checks';

// The shared checks cover what every app built on the package must satisfy: one call for a
// server-rendered app (@joeblew999/remy-ui/app-checks), with this app's own pages beside the shared ones,
// and one for the parts it lists in src/parts.json (partChecks), which serverAppChecks leaves to them.
// Site pages (for Google) and app pages (for people using the app) never mix; see paths.js.
// The docs are the docs Worker's (docs/, its own checks: docs/tests).
serverAppChecks({
  service: 'remy-auth',
  formats: { extra: formatsExtra },
  // The middleware's own switch (src/csp.ts): the checks expect the header it sends.
  cspEnforced,
});
// Every part listed in src/parts.json brings its own checks: the sitemap (seo-routes), the streamed
// place and its failing navigation (deferred-place), the status card, the time-zone pages.
partChecks({ options: {
  'seo-routes': { paths: sitePaths },
  'status-card': { service: 'remy-auth', path: '/app', endpoint: '/api/status' },
} });
// The demo reservation and the status card are contract endpoints (@joeblew999/remy-auth-contract).
apiChecks({ router, title: info.title, origins: registeredOrigins });
reservationApiChecks();
codeSplittingChecks({ paths: sitePaths });
codeSplittingChecks({ paths: appPaths, home: '/app' });
// The app mounts TanStack Devtools (src/routes/__root.tsx), whose shell must never ship either.
buildBoundaryChecks({ paths: everyPath, markers: [
  { name: 'request.cf', pattern: /\.cf\b/, source: 'packages/ui/src/parts/deferred-place/place.server.ts' },
  { name: 'TanStack Devtools (the shell hosting the panels)', pattern: /tsd-(?:control|surface)\b/, source: { package: '@tanstack/devtools', from: '@tanstack/react-devtools' } },
] });
// Rows only this server-rendered app has on the formats page: more Intl examples (Cloudflare's geolocation: the deferred-place part's checks).
async function formatsExtra(page: Page, locale: string) {
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
}

// Checks that belong to this repository: server rendering itself, in each catalog's language. The
// catalogs' completeness, placeholders and plurals are i18n:messages:check (tasks/i18n).
const settings = JSON.parse(readFileSync('packages/ui/project.inlang/settings.json', 'utf8'));
const catalogs: Record<string, Record<string, any>> = Object.fromEntries(
  (settings.locales as string[]).map(locale => [locale, JSON.parse(readFileSync(`packages/ui/messages/${locale}.json`, 'utf8'))]));
test.use({ timezoneId: 'Asia/Tokyo' });

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

// The docs moved to the docs Worker: each old address answers a permanent redirect to its page there,
// in the same language (src/routes/docs.$.tsx), so links and search engines follow.
test('the old docs addresses redirect to the docs Worker, keeping the language', async ({ request }) => {
  for (const [from, to] of [['/en/docs', '/dev'], ['/en/docs/gui', '/dev/gui'], ['/es/docs/how-we-work', '/dev/es/how-we-work']]) {
    const response = await request.get(from!, { maxRedirects: 0 });
    expect(response.status(), from).toBe(301);
    expect(response.headers().location, from).toBe(`${process.env.DOCS_ORIGIN}${to}`);
  }
});
