import type { Locale } from './paraglide/runtime.js';

/** A locale's own calendar, digit, clock and week conventions, from the runtime's CLDR data. */
export type LocaleInfo = {
  calendar: string; otherCalendars: string[]; numberingSystem: string; hourCycle: string;
  firstDay?: number; weekend?: number[];
};

// The Intl Locale Info methods are not Baseline yet, so this runs on the server only
// (route loaders) and falls back to the resolved formatting options where missing.
type LocaleWithInfo = Intl.Locale & {
  getCalendars?: () => string[]; getNumberingSystems?: () => string[];
  getWeekInfo?: () => { firstDay: number; weekend: number[] };
};
export function localeInfo(locale: Locale): LocaleInfo {
  const resolved = new Intl.DateTimeFormat(locale, { hour: 'numeric' }).resolvedOptions();
  const tag = new Intl.Locale(locale) as LocaleWithInfo;
  const calendars = tag.getCalendars?.() ?? [resolved.calendar];
  const week = tag.getWeekInfo?.();
  return {
    calendar: resolved.calendar,
    otherCalendars: calendars.filter(calendar => calendar !== resolved.calendar),
    numberingSystem: tag.getNumberingSystems?.()[0] ?? resolved.numberingSystem,
    hourCycle: resolved.hourCycle ?? 'h23',
    firstDay: week?.firstDay, weekend: week?.weekend,
  };
}

/** The localized name of an ISO weekday number (1 = Monday … 7 = Sunday). */
export function weekdayName(locale: Locale, day: number): string {
  // 2024-01-01 is a Monday.
  return new Intl.DateTimeFormat(locale, { weekday: 'long', timeZone: 'UTC' }).format(new Date(Date.UTC(2024, 0, day)));
}
