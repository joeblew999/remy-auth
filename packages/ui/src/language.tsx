import { useState } from 'react';
import { locales, localizeHref, setLocale, getTextDirection, type Locale } from './paraglide/runtime.js';
import { localeName } from './locale';
import { m } from './paraglide/messages.js';
import { Button, buttonVariants } from './components/button';
import { Alert, AlertAction, AlertDescription } from './components/alert';

// Plain anchors with Paraglide-localized hrefs: a language change is a full navigation, and
// setLocale records the choice in Paraglide's cookie without a second navigation.

/** Links to every language version of the current path, marking the current one. */
export function LanguageSwitcher({ locale, path = '' }: { locale: Locale; path?: string }) {
  return <nav aria-label={m.language_label({}, { locale })} className="languages flex gap-1">
    {locales.map(value => <a key={value} className={buttonVariants({ variant: value === locale ? 'secondary' : 'ghost', size: 'sm' })}
      href={localizeHref(path || '/', { locale: value })} lang={value} hrefLang={value}
      aria-current={value === locale ? 'page' : undefined}
      onClick={() => setLocale(value, { reload: false })}>{localeName(value)}</a>)}
  </nav>;
}

/** Offers the visitor's preferred language without redirecting; dismissing remembers the current one. */
export function LanguageHint({ locale, path = '', preferred }: { locale: Locale; path?: string; preferred?: Locale }) {
  const [dismissed, setDismissed] = useState(false);
  if (!preferred || preferred === locale || dismissed) return null;
  return <Alert className="language-hint mt-4" lang={preferred} dir={getTextDirection(preferred)}>
    <AlertDescription>{m.language_hint({ language: localeName(preferred) }, { locale: preferred })}</AlertDescription>
    <AlertAction className="flex flex-wrap items-center gap-2">
      <a className={buttonVariants({ variant: 'link', size: 'sm' })} href={localizeHref(path || '/', { locale: preferred })} hrefLang={preferred}
        onClick={() => setLocale(preferred, { reload: false })}>
        {m.continue_in({ language: localeName(preferred) }, { locale: preferred })}
      </a>
      <Button variant="outline" size="sm" lang={locale} dir={getTextDirection(locale)} onClick={() => { setLocale(locale, { reload: false }); setDismissed(true); }}>
        {m.keep_language({ language: localeName(locale) }, { locale })}
      </Button>
    </AlertAction>
  </Alert>;
}
