export { locales, isLocale, baseLocale } from './paraglide/runtime.js';
export type { Locale } from './paraglide/runtime.js';
import type { Locale } from './paraglide/runtime.js';

export type Direction = 'ltr' | 'rtl';

// Scripts written right to left, by ISO 15924 code. The locale's script comes from
// CLDR likely subtags through Intl, so no locale list is hardcoded here.
const rtlScripts = new Set(['Arab', 'Hebr', 'Syrc', 'Thaa', 'Nkoo', 'Adlm', 'Rohg', 'Mand', 'Samr']);

/** Document direction for a locale; identical on the server and in every browser. */
export function direction(locale: Locale): Direction {
  return rtlScripts.has(new Intl.Locale(locale).maximize().script ?? '') ? 'rtl' : 'ltr';
}

/** The locale's name in its own language (its endonym), from the runtime's CLDR data. */
export function localeName(locale: Locale, inLocale: Locale = locale): string {
  return new Intl.DisplayNames([inLocale], { type: 'language' }).of(locale) ?? locale;
}
