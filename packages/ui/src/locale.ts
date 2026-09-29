// Paraglide's runtime owns the locale list, detection, direction and URL localisation.
export { locales, isLocale, baseLocale, getLocale, setLocale, localizeHref, localizeUrl, deLocalizeHref, cookieName,
  getTextDirection as direction } from './paraglide/runtime.js';
export type { Locale } from './paraglide/runtime.js';
import type { Locale } from './paraglide/runtime.js';
import { getLocale as platformLocale } from './paraglide/runtime.js';
// Registers the custom-chinese strategy wherever the locale helpers load (server and browser).
import './matching.js';

/** The locale's name in its own language (its endonym), from the runtime's CLDR data. */
export function localeName(locale: Locale, inLocale: Locale = locale): string {
  return new Intl.DisplayNames([inLocale], { type: 'language' }).of(locale) ?? locale;
}

/**
 * A second Paraglide catalog (a package's own strings, compiled from its own inlang project) follows the
 * platform's language: pass that catalog's runtime once, where the package's messages are first imported.
 * Its getLocale then delegates to this one, on the server (the request's language) and in the browser.
 * `followLocale(await import('./paraglide/runtime.js'))`, or with a static import of the runtime.
 */
export function followLocale(runtime: { overwriteGetLocale: (fn: () => any) => void }) {
  runtime.overwriteGetLocale(() => platformLocale());
}
