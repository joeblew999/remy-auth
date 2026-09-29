import { HeadContent, Outlet, Scripts, createRootRoute, useRouterState } from '@tanstack/react-router';
import { docsLangOfPath } from '../docs/table.js';
import '../styles.css';

// The docs document. Each page's own language sets <html lang> (/docs/es/... is Spanish); right-to-left
// languages turn the page. Fumadocs' RootProvider (theme, search, languages) wraps each docs page (view.tsx).
export const Route = createRootRoute({
  head: () => ({
    meta: [{ charSet: 'utf-8' }, { name: 'viewport', content: 'width=device-width, initial-scale=1' }],
    links: [{ rel: 'icon', href: '/favicon.svg', type: 'image/svg+xml' }],
  }),
  shellComponent: Document,
  component: Outlet,
  notFoundComponent: () => <main className="p-8"><h1 className="text-2xl font-semibold">Page not found</h1><p className="mt-2"><a className="underline" href="/docs">The docs</a></p></main>,
});

function Document({ children }: { children: React.ReactNode }) {
  const lang = docsLangOfPath(useRouterState({ select: state => state.location.pathname }))?.lang ?? 'en';
  const dir = ['ar', 'fa', 'he', 'ur'].includes(lang) ? 'rtl' : 'ltr';
  return <html lang={lang} dir={dir} suppressHydrationWarning>
    <head><HeadContent /></head>
    <body>{children}<Scripts /></body>
  </html>;
}
