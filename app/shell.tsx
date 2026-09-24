import { Link, useRouteLoaderData } from 'react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { LanguageHint, LanguageSwitcher } from '@joeblew999/remy-ui/language';
import { m } from '@joeblew999/remy-ui/messages';

export function Shell({ locale, path = '', children }: {
  locale: Locale; path?: string; children: React.ReactNode;
}) {
  const root = useRouteLoaderData('root') as { preferred?: Locale } | undefined;
  return <div className="site">
    <a className="skip-link" href="#main">{m.skip_link({}, { locale })}</a>
    <LanguageHint locale={locale} path={path} preferred={root?.preferred} />
    <header className="site-header">
      <Link className="brand" to={`/${locale}`}><span aria-hidden="true" className="brand-mark">r</span>remy<span aria-hidden="true" className="brand-dot">.</span></Link>
      <LanguageSwitcher locale={locale} path={path} />
    </header>
    <main id="main">{children}</main>
    <footer><span>© {new Date().getUTCFullYear()} Remy</span><span>{m.footer({}, { locale })}</span></footer>
  </div>;
}
