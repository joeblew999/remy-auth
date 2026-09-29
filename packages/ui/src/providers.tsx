import { DirectionProvider } from './components/direction';
import { ThemeProvider } from './theme';
import { PreferredProvider, RemyAppProvider, type RemyApp } from './app-config';
import { direction, type Locale } from './locale';
// Zod without eval, for every app's schemas under the nonce CSP.
import './zod-csp';

/**
 * Everything an app's document needs around its pages, in one place so no app misses one: the page's
 * reading direction (shadcn's DirectionProvider), the theme (light, dark or the system's; the header's
 * toggle and the Settings page need it), the app's frame settings (app-config.tsx: its name, source and
 * links, from defineRemyApp) and the language worth offering (the root loader's `preferred`), which every
 * frame reads, so no page passes it. An app's root renders its pages inside it:
 * `<AppProviders locale={locale} app={remyApp} preferred={preferred}>`.
 */
export function AppProviders({ locale, app, preferred, children }: { locale: Locale; app: RemyApp; preferred?: Locale; children: React.ReactNode }) {
  return <DirectionProvider direction={direction(locale)}>
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <RemyAppProvider value={app}><PreferredProvider value={preferred}>{children}</PreferredProvider></RemyAppProvider>
    </ThemeProvider>
  </DirectionProvider>;
}
