import { useState } from 'react';
import { locales, localizeHref, setLocale, getTextDirection, type Locale } from './paraglide/runtime.js';
import { localeName } from './locale';
import { m } from './paraglide/messages.js';

// Plain anchors with Paraglide-localized hrefs: a language change is a full navigation, and
// setLocale records the choice in Paraglide's cookie without a second navigation.

/** Links to every language version of the current path, marking the current one. */
export function LanguageSwitcher({ locale, path = '' }: { locale: Locale; path?: string }) {
  return <nav aria-label={m.language_label({}, { locale })} className="languages">
    {locales.map(value => <a key={value} href={localizeHref(path || '/', { locale: value })} lang={value} hrefLang={value}
      aria-current={value === locale ? 'page' : undefined}
      onClick={() => setLocale(value, { reload: false })}>{localeName(value)}</a>)}
  </nav>;
}

/** Offers the visitor's preferred language without redirecting; dismissing remembers the current one. */
export function LanguageHint({ locale, path = '', preferred }: { locale: Locale; path?: string; preferred?: Locale }) {
  const [dismissed, setDismissed] = useState(false);
  if (!preferred || preferred === locale || dismissed) return null;
  return <aside className="language-hint" lang={preferred} dir={getTextDirection(preferred)}>
    <span>{m.language_hint({ language: localeName(preferred) }, { locale: preferred })}</span>
    <a href={localizeHref(path || '/', { locale: preferred })} hrefLang={preferred} onClick={() => setLocale(preferred, { reload: false })}>
      {m.continue_in({ language: localeName(preferred) }, { locale: preferred })}
    </a>
    <button type="button" lang={locale} dir={getTextDirection(locale)} onClick={() => { setLocale(locale, { reload: false }); setDismissed(true); }}>
      {m.keep_language({ language: localeName(locale) }, { locale })}
    </button>
  </aside>;
}
