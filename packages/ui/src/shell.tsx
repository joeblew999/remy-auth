import { createContext, useContext } from 'react';
import { Link } from '@tanstack/react-router';
import { ArrowLeftIcon } from 'lucide-react';
import type { Locale } from './paraglide/runtime.js';
import { m } from './paraglide/messages.js';
import { LanguageHint, LanguageLinks, LanguageSwitcher } from './language';
import { ModeToggle } from './theme';
import { NavigationMenu, NavigationMenuItem, NavigationMenuLink, NavigationMenuList } from './components/navigation-menu';
import { buttonVariants } from './components/button';
import { Separator } from './components/separator';

// The frame every site page shares (header, language links, footer) and the pieces app pages reuse,
// apart from the pages themselves (./pages): a page that only needs the frame, such as an app's docs
// or its not-found page, imports this module and downloads none of the home or formats pages' code.
// ./pages re-exports everything here, so imports from it keep working.

/** "Skip to content", the first thing in every frame, site or app. */
export function SkipLink({ locale }: { locale: Locale }) {
  return <a className="skip-link sr-only focus:not-sr-only focus:fixed focus:start-2 focus:top-2 focus:z-60 focus:bg-background focus:p-3" href="#main">{m.skip_link({}, { locale })}</a>;
}

/**
 * Which kind of page this is (paths.js explains the two): a small, muted line at the foot of every
 * page, out of the visitor's way, where anyone who wants to know can still read it.
 */
export function ZoneBadge({ locale, app }: { locale: Locale; app: boolean }) {
  return <p className="text-xs text-muted-foreground" data-zone={app ? 'app' : 'site'}>{app ? m.zone_app({}, { locale }) : m.zone_site({}, { locale })}</p>;
}

/**
 * Links an app adds to the site header's navigation, after the shared ones: a function of the page's
 * de-localized path (so a link can mark itself active) returning NavigationMenuItems. remy-auth adds
 * its docs this way (the guide and the developer docs, on its docs Worker); an app that provides nothing
 * gets the shared links only.
 */
export const SiteNavLinks = createContext<((path: string) => React.ReactNode) | undefined>(undefined);

/**
 * Links an app adds to the app sidebar's footer, above "Back to the site": SidebarMenuItems, such as a
 * link to the app's guide. An app that provides nothing gets "Back to the site" only.
 */
export const AppNavLinks = createContext<React.ReactNode>(undefined);

/**
 * Where evaluators find the app's source: the site header's "GitHub" link. Each app passes its own
 * repository URL; an app that passes none shows no source link.
 */
export const SourceLink = createContext<string | undefined>(undefined);

/**
 * The frame of a site page: static shadcn components only (links styled as buttons,
 * Separator), so the page is complete without JavaScript. `preferred` is the language to offer.
 */
export function SiteShell({ locale, path = '', preferred, children }: { locale: Locale; path?: string; preferred?: Locale; children: React.ReactNode }) {
  const o = { locale };
  const appLinks = useContext(SiteNavLinks);
  const source = useContext(SourceLink);
  return <div className="flex min-h-svh w-full flex-col px-4 md:px-8">
    <SkipLink locale={locale} />
    <LanguageHint locale={locale} path={path} preferred={preferred} />
    <header className="site-header flex flex-wrap items-center gap-x-2 gap-y-1 py-3">
      <Link className={buttonVariants({ variant: 'ghost', className: 'brand font-semibold' })} to="/" preload="intent">Remy</Link>
      <NavigationMenu aria-label={m.nav_heading({}, o)} className="order-last max-w-none basis-full justify-start sm:order-none sm:basis-auto">
        <NavigationMenuList className="flex-wrap justify-start">
          <NavigationMenuItem>
            <NavigationMenuLink active={path === '/formats'} render={<Link to="/formats" preload="intent" />}>{m.nav_formats({}, o)}</NavigationMenuLink>
          </NavigationMenuItem>
          {appLinks?.(path)}
          {source && <NavigationMenuItem>
            <NavigationMenuLink href={source}>GitHub</NavigationMenuLink>
          </NavigationMenuItem>}
        </NavigationMenuList>
      </NavigationMenu>
      <div className="ms-auto flex items-center gap-1">
        <LanguageSwitcher locale={locale} path={path} />
        <ModeToggle locale={locale} />
        <Link className={buttonVariants({ size: 'sm' })} to="/app" preload="intent">{m.open_app({}, o)}</Link>
      </div>
    </header>
    <Separator />
    <main id="main" className="flex-1 py-10">{children}</main>
    <Separator />
    <footer className="flex flex-col gap-3 py-4"><LanguageLinks locale={locale} path={path} /><ZoneBadge locale={locale} app={false} /></footer>
  </div>;
}

/** The frame of a site page, also for not-found and error pages. App pages use AppShell from ./app-pages. */
export const Shell = SiteShell;

export function Intro({ locale, label, title, intro, back = true, backTo = '/' }: { locale: Locale; label?: string; title: string; intro: string; back?: boolean; backTo?: '/' | '/app' }) {
  return <>
    {back && <Link className="inline-flex items-center gap-1 text-sm text-muted-foreground" to={backTo} preload="intent"><ArrowLeftIcon aria-hidden="true" className="size-4 rtl:rotate-180" />{m.home_link({}, { locale })}</Link>}
    {label && <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">{label}</p>}
    <h1 className="text-4xl font-semibold tracking-tight text-balance sm:text-5xl">{title}</h1>
    <p className="max-w-lg text-lg leading-relaxed text-muted-foreground">{intro}</p>
  </>;
}
