import { useState } from 'react';
import { Link, useRouteLoaderData } from 'react-router';
import { locales, localeName, direction, type Locale } from '@remy/ui/locale';
import { m } from '@remy/ui/messages';
import { rememberLocale } from './preference';

/** Offers the visitor's preferred language without redirecting; dismissing remembers the current one. */
function LanguageHint({ locale, path }: { locale: Locale; path: string }) {
  const root = useRouteLoaderData('root') as { preferred?: Locale } | undefined;
  const [dismissed, setDismissed] = useState(false);
  const suggested = root?.preferred;
  if (!suggested || suggested === locale || dismissed) return null;
  return <aside className="language-hint" lang={suggested} dir={direction(suggested)}>
    <span>{m.language_hint({ language: localeName(suggested) }, { locale: suggested })}</span>
    <a href={`/${suggested}${path}`} hrefLang={suggested} onClick={() => rememberLocale(suggested)}>
      {m.continue_in({ language: localeName(suggested) }, { locale: suggested })}
    </a>
    <button type="button" lang={locale} dir={direction(locale)} onClick={() => { rememberLocale(locale); setDismissed(true); }}>
      {m.keep_language({ language: localeName(locale) }, { locale })}
    </button>
  </aside>;
}

export function Shell({ locale, path = '', children }: {
  locale: Locale; path?: string; children: React.ReactNode;
}) {
  return <div className="site">
    <a className="skip-link" href="#main">{m.skip_link({}, { locale })}</a>
    <LanguageHint locale={locale} path={path} />
    <header className="site-header">
      <Link className="brand" to={`/${locale}`}><span aria-hidden="true" className="brand-mark">r</span>remy<span aria-hidden="true" className="brand-dot">.</span></Link>
      <nav aria-label={m.language_label({}, { locale })} className="languages">
        {locales.map(value => <a key={value} href={`/${value}${path}`} lang={value} hrefLang={value}
          aria-current={value === locale ? 'page' : undefined} onClick={() => rememberLocale(value)}>{localeName(value)}</a>)}
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer><span>© {new Date().getUTCFullYear()} Remy</span><span>{m.footer({}, { locale })}</span></footer>
  </div>;
}
