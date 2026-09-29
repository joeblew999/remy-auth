import type { Locale } from './paraglide/runtime.js';
import { LanguageHint } from './language';
import { SidebarInset, SidebarProvider } from './components/sidebar';
import { AppSidebar } from './blocks/sidebar-16/components/app-sidebar';
import { SiteHeader } from './blocks/sidebar-16/components/site-header';
import { BottomNav } from './blocks/bottom-nav/bottom-nav';
import { SkipLink, ZoneBadge } from './shell';
import { usePreferredLocale } from './app-config';

// The app frame alone (paths.js: app pages need JavaScript), apart from remy-auth's showcase pages in
// ./app-pages, so an app that uses the frame type-checks and downloads none of them. Its pages, brand and
// links are the app's (defineRemyApp, through AppProviders).

/**
 * The frame of an app page: shadcn's sidebar-16 block (blocks/sidebar-16), a sticky site header
 * with the sidebar toggle, then the sidebar with the app's pages; on phones the bottom bar instead
 * (blocks/bottom-nav). Needs JavaScript. `preferred` comes from AppProviders unless a page passes its own.
 */
export function AppShell({ locale, path = '/app', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  const offered = usePreferredLocale();
  return <div className="[--header-height:calc(--spacing(14))]">
    <SkipLink locale={locale} />
    <SidebarProvider className="flex flex-col">
      <SiteHeader locale={locale} path={path} />
      <div className="flex flex-1">
        <AppSidebar locale={locale} />
        <SidebarInset>
          {/* Room below the content for the phone's bottom bar (4rem and the home indicator). */}
          <div className="flex flex-1 flex-col gap-4 p-4 pb-[calc(6rem+env(safe-area-inset-bottom))] md:p-8">
            <LanguageHint locale={locale} path={path} preferred={preferred ?? offered} />
            <main id="main" className="w-full flex-1">{children}</main>
            <footer><ZoneBadge locale={locale} app /></footer>
          </div>
        </SidebarInset>
      </div>
      <BottomNav locale={locale} />
    </SidebarProvider>
  </div>;
}
