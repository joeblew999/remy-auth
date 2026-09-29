import type { Page } from '@playwright/test';
import type { PartName } from './parts/list.js';
import type { HomeContent } from './checks.js';

type AppCheckOptions = {
  /** The Worker's service name in its logs and response headers. */
  service: string;
  /** The app's site pages (for Google; '' is its home): zones, public pages, entry URLs, fonts, observability. */
  sitePaths: string[];
  /** The app's app pages (under /app), if it has an app side. */
  appPaths?: string[];
  /** The home page's own words, checked exactly; without them, only that a heading, description and brand are there. */
  home?: HomeContent;
  /**
   * The showcase's checks (the demo, formats, clock and settings navigation, search params, preload, leave
   * guard, device place), for an app that shows remy-auth's showcase pages: remy-auth, remy-auth-app.
   */
  showcase?: {
    /** Passed to formatsChecks: rows only this app's formats page has. */
    formats?: { extra?: (page: Page, locale: string) => Promise<void> };
    /** Where the device-place row is (default /app/location). */
    devicePath?: string;
  };
};

/** The shared checks of a server-rendered app over its own pages: zones, public pages, text, fonts, redirecting entry URLs, the theme, observability, CSP; the showcase's with `showcase`. */
export declare function serverAppChecks(options: AppCheckOptions & {
  oneLanguage?: { locale: string; paths: string[]; translations?: Record<string, string[]> };
  /**
   * The app's listed parts (default: its src/parts.json, or none without one). What a listed part owns
   * runs with partChecks() instead: seo-routes the sitemap, deferred-place the network place.
   */
  parts?: readonly PartName[];
  /** Whether the app enforces its nonce CSP (default true) or sends it report-only: the app's own switch, passed to cspChecks. */
  cspEnforced?: boolean;
}): void;
/** The shared checks of a fully prerendered app over its own pages: zones, public pages, static entry pages, the theme, text, observability; the showcase's (without server functions) with `showcase`. */
export declare function prerenderedAppChecks(options: AppCheckOptions): void;
