import { Link } from 'react-router';
import { locales, localeName, type Locale } from '@remy/ui/locale';
import { m } from '@remy/ui/messages';

export function Shell({ locale, path = '', children }: {
  locale: Locale; path?: string; children: React.ReactNode;
}) {
  return <div className="site">
    <a className="skip-link" href="#main">{m.skip_link({}, { locale })}</a>
    <header className="site-header">
      <Link className="brand" to={`/${locale}`}><span aria-hidden="true" className="brand-mark">r</span>remy<span aria-hidden="true" className="brand-dot">.</span></Link>
      <nav aria-label={m.language_label({}, { locale })} className="languages">
        {locales.map(value => <a key={value} href={`/${value}${path}`} lang={value}
          hrefLang={value} aria-current={value === locale ? 'page' : undefined}>{localeName(value)}</a>)}
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer><span>© {new Date().getUTCFullYear()} Remy</span><span>{m.footer({}, { locale })}</span></footer>
  </div>;
}
