import { useState } from 'react';
import { locales, localizeHref, setLocale, getTextDirection, type Locale } from './paraglide/runtime.js';
import { localeName } from './locale';
import { m } from './paraglide/messages.js';
import { Button, buttonVariants } from './components/button';
import { Alert, AlertDescription } from './components/alert';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuRadioGroup, DropdownMenuRadioItem, DropdownMenuTrigger } from './components/dropdown-menu';
import { CheckIcon, LanguagesIcon } from 'lucide-react';

// Plain anchors with Paraglide-localized hrefs: a language change is a full navigation, and
// setLocale records the choice in Paraglide's cookie without a second navigation.

/** Links to every language version of the current path, marking the current one: the complete list a site page's footer carries, reachable without JavaScript. */
export function LanguageLinks({ locale, path = '' }: { locale: Locale; path?: string }) {
  return <nav id="languages" aria-label={m.languages_available({}, { locale })} className="language-list flex flex-wrap gap-1">
    {locales.map(value => <a key={value} className={buttonVariants({ variant: value === locale ? 'secondary' : 'ghost', size: 'sm' })}
      href={localizeHref(path || '/', { locale: value })} lang={value} hrefLang={value}
      aria-current={value === locale ? 'page' : undefined}
      onClick={() => setLocale(value, { reload: false })}>{localeName(value)}</a>)}
  </nav>;
}

/**
 * The language picker in a site page's header: shadcn's DropdownMenu whose items are the same real
 * links. Its trigger is a link to the footer's LanguageLinks, so without JavaScript it still leads
 * to every language; with JavaScript it opens the menu instead.
 */
export function LanguageSwitcher({ locale, path = '' }: { locale: Locale; path?: string }) {
  return <nav aria-label={m.language_label({}, { locale })} className="languages">
    <DropdownMenu>
      <DropdownMenuTrigger nativeButton={false} render={<a href="#languages" onClick={event => event.preventDefault()} />}
        className={buttonVariants({ variant: 'ghost', size: 'sm' })}>
        <LanguagesIcon />{localeName(locale)}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {locales.map(value => <DropdownMenuItem key={value}
          render={<a href={localizeHref(path || '/', { locale: value })} lang={value} hrefLang={value}
            aria-current={value === locale ? 'page' : undefined} onClick={() => setLocale(value, { reload: false })} />}>
          {localeName(value)}{value === locale && <CheckIcon className="ms-auto" />}
        </DropdownMenuItem>)}
      </DropdownMenuContent>
    </DropdownMenu>
  </nav>;
}

/**
 * The language picker for app pages: shadcn's DropdownMenu with a radio group, the menu pattern for
 * choosing one option. Choosing calls Paraglide's setLocale, which remembers the choice and loads
 * this page in that language. Site pages use LanguageSwitcher's plain links, which need no JavaScript.
 */
export function LanguageMenu({ locale }: { locale: Locale }) {
  return <DropdownMenu>
    <DropdownMenuTrigger render={<Button variant="ghost" size="sm" />} aria-label={m.language_label({}, { locale })}>
      <LanguagesIcon />{localeName(locale)}
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end">
      <DropdownMenuRadioGroup value={locale} onValueChange={value => setLocale(value as Locale)}>
        {locales.map(value => <DropdownMenuRadioItem key={value} value={value} lang={value}>{localeName(value)}</DropdownMenuRadioItem>)}
      </DropdownMenuRadioGroup>
    </DropdownMenuContent>
  </DropdownMenu>;
}

/** Offers the visitor's preferred language without redirecting; dismissing remembers the current one. */
export function LanguageHint({ locale, path = '', preferred }: { locale: Locale; path?: string; preferred?: Locale }) {
  const [dismissed, setDismissed] = useState(false);
  if (!preferred || preferred === locale || dismissed) return null;
  return <Alert className="language-hint mt-4" lang={preferred} dir={getTextDirection(preferred)}>
    <AlertDescription>{m.language_hint({ language: localeName(preferred) }, { locale: preferred })}</AlertDescription>
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <a className={buttonVariants({ variant: 'link', size: 'sm' })} href={localizeHref(path || '/', { locale: preferred })} hrefLang={preferred}
        onClick={() => setLocale(preferred, { reload: false })}>
        {m.continue_in({ language: localeName(preferred) }, { locale: preferred })}
      </a>
      <Button variant="outline" size="sm" lang={locale} dir={getTextDirection(locale)} onClick={() => { setLocale(locale, { reload: false }); setDismissed(true); }}>
        {m.keep_language({ language: localeName(locale) }, { locale })}
      </Button>
    </div>
  </Alert>;
}
