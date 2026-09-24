import { Link } from 'react-router';
import { locales, type Locale } from '@remy/ui/locale';
import { m } from '@remy/ui/messages';

const names: Record<Locale, string> = { en: 'English', es: 'Español' };
export function Shell({ locale, demo = false, children }: {
  locale: Locale; demo?: boolean; children: React.ReactNode;
}) {
  return <div className="site">
    <a className="skip-link" href="#main">{m.skip_link({}, { locale })}</a>
    <header className="site-header">
      <Link className="brand" to={`/${locale}`} aria-label="Remy"><span aria-hidden="true" className="brand-mark">r</span>remy<span className="brand-dot">.</span></Link>
      <nav aria-label={m.language_label({}, { locale })} className="languages">
        {locales.map(value => <a key={value} href={`/${value}${demo ? '/demo' : ''}`} lang={value}
          hrefLang={value} aria-current={value === locale ? 'page' : undefined}>{names[value]}</a>)}
      </nav>
    </header>
    <main id="main">{children}</main>
    <footer><span>© {new Date().getUTCFullYear()} Remy</span><span>{m.footer({}, { locale })}</span></footer>
  </div>;
}
