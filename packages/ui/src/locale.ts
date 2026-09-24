// Paraglide's runtime owns the locale list, detection, direction and URL localisation.
export { locales, isLocale, baseLocale, getLocale, setLocale, localizeHref, localizeUrl, deLocalizeHref, cookieName,
  getTextDirection as direction } from './paraglide/runtime.js';
export type { Locale } from './paraglide/runtime.js';
import type { Locale } from './paraglide/runtime.js';

/** The locale's name in its own language (its endonym), from the runtime's CLDR data. */
export function localeName(locale: Locale, inLocale: Locale = locale): string {
  return new Intl.DisplayNames([inLocale], { type: 'language' }).of(locale) ?? locale;
}
