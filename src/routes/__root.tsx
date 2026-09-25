import { HeadContent, Outlet, Scripts, createRootRoute } from '@tanstack/react-router';
import { getLocale, direction } from '@joeblew999/remy-ui/locale';
import { m } from '@joeblew999/remy-ui/messages';
import { preferredLocale } from '../preferred';
import styles from '../styles.css?url';

export const Route = createRootRoute({
  // The language worth offering on this page, if any (see preferred.ts); cheap, so it reruns on every navigation.
  loader: () => ({ preferred: preferredLocale() }),
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }, { rel: 'stylesheet', href: styles }],
  }),
  shellComponent: Document,
  component: Outlet,
  notFoundComponent: () => <Problem missing />,
  errorComponent: () => <Problem missing={false} />,
});

/** The document: Paraglide's locale for this request (server) or URL (browser) sets language and direction. */
function Document({ children }: { children: React.ReactNode }) {
  const locale = getLocale();
  return <html lang={locale} dir={direction(locale)}>
    <head><HeadContent /></head>
    <body>{children}<Scripts /></body>
  </html>;
}

/** Localized not-found (HTTP 404) and error pages, kept out of search results. */
function Problem({ missing }: { missing: boolean }) {
  const locale = getLocale();
  const title = missing ? m.not_found({}, { locale }) : m.error_title({}, { locale });
  return <main className="mx-auto max-w-3xl px-6 py-20"><meta name="robots" content="noindex" />
    <title>{title}</title>
    <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
    <p className="my-6 text-muted-foreground">{missing ? m.not_found_detail({}, { locale }) : m.error_detail({}, { locale })}</p>
    <a className="underline underline-offset-4" href={`/${locale}`}>{m.home_link({}, { locale })}</a>
  </main>;
}
