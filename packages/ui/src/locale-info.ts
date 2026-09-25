import type { Locale } from './paraglide/runtime.js';
import { ownValues } from './locale-data.js';

// Every language's own values and the formats page's choices (the union over all languages) come
// from one plain-JavaScript module, which the shared checks read too.
export { ownValues, allChoices, choicesFor, choiceKinds, searchDefaults, maxCount, type ChoiceKind, type OwnValues } from './locale-data.js';

/** A locale's own calendar, digit, clock, week, region, currency and plural conventions, derived from the locale. */
export type LocaleInfo = {
  calendar: string; otherCalendars: string[]; numberingSystem: string; hourCycle: string;
  firstDay: number; weekend: number[]; region: string; currency: string; counts: number[];
};

// Intl Locale Info (getCalendars, getNumberingSystems, getWeekInfo) is Baseline since 2026-07-21
// and present in workerd; decided in .plans/hard-localisation.md: rely on it, no fallback. The
// deprecated getters (weekInfo, calendars, ...) are never used.
type LocaleWithInfo = Intl.Locale & {
  getCalendars(): string[]; getNumberingSystems(): string[];
  getWeekInfo(): { firstDay: number; weekend: number[] };
};
const withInfo = (locale: string) => new Intl.Locale(locale) as LocaleWithInfo;

/**
 * The tag every formatter on the pages uses: the locale with its own calendar and digits named
 * explicitly (fa → fa-u-ca-persian-nu-arabext, th → th-u-ca-buddhist-nu-latn), so a runtime whose
 * resolved defaults differ from the locale's CLDR preferences still writes dates and numbers the
 * language's way. The page's `lang` stays the plain locale; Paraglide's messages format with the
 * plain locale too, and the shared formats check proves both agree.
 */
export function formatLocale(locale: Locale): string {
  const tag = withInfo(locale);
  return new Intl.Locale(locale, { calendar: tag.getCalendars()[0], numberingSystem: tag.getNumberingSystems()[0] }).toString();
}

export function localeInfo(locale: Locale): LocaleInfo {
  const tag = withInfo(locale);
  const [calendar, ...otherCalendars] = tag.getCalendars();
  const { firstDay, weekend } = tag.getWeekInfo();
  const { region, currency, counts } = ownValues(locale);
  return {
    calendar, otherCalendars,
    numberingSystem: tag.getNumberingSystems()[0],
    hourCycle: new Intl.DateTimeFormat(formatLocale(locale), { hour: 'numeric' }).resolvedOptions().hourCycle ?? 'h23',
    firstDay, weekend,
    region, currency, counts,
  };
}

/** The localized name of an ISO weekday number (1 = Monday … 7 = Sunday). */
export function weekdayName(locale: Locale, day: number, weekday: 'long' | 'short' = 'long'): string {
  // 2024-01-01 is a Monday.
  return new Intl.DateTimeFormat(locale, { weekday, timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));
}

/** The seven ISO weekday numbers in this locale's week order, starting on its first day. */
export function weekOrder(firstDay: number): number[] {
  return Array.from({ length: 7 }, (_, index) => ((firstDay - 1 + index) % 7) + 1);
}

/** The words of `text` as this language divides them (Intl.Segmenter), for languages written without spaces too. */
export function words(locale: Locale, text: string): string[] {
  return [...new Intl.Segmenter(locale, { granularity: 'word' }).segment(text)].filter(part => part.isWordLike).map(part => part.segment);
}
