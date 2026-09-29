// The showcase's checks (.plans/platform-structure.md, fix 2): what remy-auth's showcase pages must do (the demo,
// the formats page, the app navigation, search params, preload, the leave guard, the device place), for the
// apps that show them (remy-auth, remy-auth-app). No platform check set calls them: an app showing the showcase
// calls showcaseChecks() itself. Plain JavaScript, like ../checks.js.
import { test, expect } from '@playwright/test';
import { locales, baseLocale } from '@joeblew999/remy-ui/runtime';
import { m } from '@joeblew999/remy-ui/messages';
import { samples } from '@joeblew999/remy-ui/samples';
import { ownValues, choicesFor, choiceKinds } from '@joeblew999/remy-ui/locale-data';
import { checkedLocales, collectErrors, digits, direction, endonym, foreignDigits, formatTag, hydrated, localizedPath, weekday } from '@joeblew999/remy-ui/checks';
import { navigationBlockingChecks } from './navigation-blocking.checks.js';
import { preloadChecks } from './preload.checks.js';
import { searchParamsChecks } from './search-params.checks.js';
import { devicePlaceChecks } from './device-place.checks.js';

/**
 * Every showcase check, for an app showing the showcase pages. `rendering`: 'server' (TanStack Start renders
 * each request) or 'prerendered' (no server functions); `formats`: rows only this app's formats page has;
 * `devicePath`: where the device-place row is; `network`: the network place beside it (the deferred-place part).
 */
export function showcaseChecks({ rendering = 'server', formats = {}, devicePath = '/app/location', network = false } = {}) {
  const server = rendering === 'server';
  demoChecks();
  appNavChecks();
  formatsChecks(formats);
  navigationBlockingChecks();
  preloadChecks(server ? undefined : { serverFn: false });
  searchParamsChecks(server ? undefined : { serverRendered: false });
  devicePlaceChecks(server ? { path: devicePath, network } : { path: devicePath });
}

/**
 * The app's two navigations (.plans/done/mobile-navigation.md): on a phone the bottom bar holds the core pages
 * and More opens the sidebar with every page; on a tablet or desktop the sidebar alone, no bar.
 */
export function appNavChecks() {
  const o = { locale: baseLocale };
  const bar = page => page.getByRole('navigation', { name: m.nav_bottom({}, o), exact: true });
  test('on a phone the bottom bar holds the core pages, and More opens every page', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(localizedPath('/app', baseLocale));
    await expect(bar(page).getByRole('link')).toHaveCount(4);
    await hydrated(bar(page).getByRole('button', { name: m.nav_more({}, o), exact: true }));
    await bar(page).getByRole('link', { name: m.nav_clock({}, o), exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.clock_title({}, o));
    await expect(bar(page).getByRole('link', { name: m.nav_clock({}, o), exact: true })).toHaveAttribute('aria-current', 'page');
    await bar(page).getByRole('button', { name: m.nav_more({}, o), exact: true }).click();
    await page.getByRole('dialog').getByRole('link', { name: m.nav_settings({}, o), exact: true }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(m.settings_title({}, o));
  });
  test('on a desktop the sidebar has every page and there is no bottom bar', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(localizedPath('/app', baseLocale));
    await expect(bar(page)).toBeHidden();
    await expect(page.getByRole('link', { name: m.nav_settings({}, o), exact: true })).toBeVisible();
  });
  test('the clock adds a time zone to its address and names an unknown one', async ({ page }) => {
    await page.goto(`${localizedPath('/app/clock', baseLocale)}?zones=Asia/Tokyo`);
    const field = page.getByLabel(m.clock_add({}, o), { exact: true });
    await hydrated(field);
    await field.fill('america/new_york');
    await page.getByRole('button', { name: m.clock_add_button({}, o), exact: true }).click();
    await expect(page).toHaveURL(/zones=Asia%2FTokyo%2CAmerica%2FNew_York|zones=Asia\/Tokyo,America\/New_York/);
    await field.fill('Mars/Olympus');
    await page.getByRole('button', { name: m.clock_add_button({}, o), exact: true }).click();
    await expect(page.locator('#clock-zone-error')).toHaveText(m.zone_not_found({ zone: 'Mars/Olympus' }, o));
  });
}

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
      // Each language name is isolated in its own language, so right-to-left names do not reorder the list.
      await expect(page.locator('[data-sample="languages"] bdi')).toHaveText(locales.map(endonym));
      expect(await page.locator('[data-sample="languages"] bdi').evaluateAll(nodes => nodes.map(node => node.lang))).toEqual([...locales]);
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

