import { DirectionProvider } from './components/direction';
import { ThemeProvider } from './theme';
import { SourceLink } from './shell';
import { direction, type Locale } from './locale';

/**
 * Everything an app's document needs around its pages, in one place so no app misses one: the page's
 * reading direction (shadcn's DirectionProvider), the theme (light, dark or the system's; the header's
 * toggle and the Settings page need it) and the app's own source link (the header's "GitHub"). An app's
 * root renders its pages inside it: `<AppProviders locale={locale} repository="https://github.com/you/app">`.
 */
export function AppProviders({ locale, repository, children }: { locale: Locale; repository?: string; children: React.ReactNode }) {
  return <DirectionProvider direction={direction(locale)}>
    <ThemeProvider defaultTheme="system" storageKey="theme">
      <SourceLink value={repository}>{children}</SourceLink>
    </ThemeProvider>
  </DirectionProvider>;
}
