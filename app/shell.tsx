import { Link, useRouteLoaderData } from 'react-router';
import type { Locale } from '@joeblew999/remy-ui/locale';
import { LanguageHint, LanguageSwitcher } from '@joeblew999/remy-ui/language';
import { m } from '@joeblew999/remy-ui/messages';

export function Shell({ locale, path = '', children }: { locale: Locale; path?: string; children: React.ReactNode }) {
  const root = useRouteLoaderData('root') as { preferred?: Locale } | undefined;
  return <div className="site mx-auto flex min-h-svh max-w-5xl flex-col px-5 sm:px-8">
    <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-10 focus:bg-background focus:p-3" href="#main">{m.skip_link({}, { locale })}</a>
    <LanguageHint locale={locale} path={path} preferred={root?.preferred} />
    <header className="site-header flex items-center justify-between gap-5 border-b py-6">
      <Link className="brand inline-flex items-center text-2xl font-bold tracking-tight text-foreground" to={`/${locale}`}>
        <span aria-hidden="true" className="me-2 grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">r</span>remy<span aria-hidden="true" className="text-primary">.</span>
      </Link>
      <LanguageSwitcher locale={locale} path={path} />
    </header>
    <main id="main" className="flex-1 py-12">{children}</main>
    <footer className="flex flex-wrap justify-between gap-4 border-t py-6 text-xs text-muted-foreground">
      <span>© {new Date().getUTCFullYear()} Remy</span><span>{m.footer({}, { locale })}</span>
    </footer>
  </div>;
}
