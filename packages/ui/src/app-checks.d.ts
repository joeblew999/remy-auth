import type { Page } from '@playwright/test';

type AppCheckOptions = {
  /** The Worker's service name in its logs and response headers. */
  service: string;
  /** The app's own site pages beside the shared ones (zones, entry URLs, observability). */
  ownSitePaths?: string[];
  /** The app's own app pages beside the shared ones. */
  ownAppPaths?: string[];
  /** Passed to formatsChecks: rows only this app's formats page has. */
  formats?: { extra?: (page: Page, locale: string) => Promise<void> };
  /** Where the device-place showcase row is (default /app/location). */
  devicePath?: string;
};

/** The shared checks of a server-rendered app: zones, public pages, text, fonts, redirecting entry URLs, demo, observability, CSP, formats and the showcase rows. */
export declare function serverAppChecks(options: AppCheckOptions & { oneLanguage?: { locale: string; paths: string[]; translations?: Record<string, string[]> } }): void;
/** The shared checks of a fully prerendered app: zones, public pages, static entry pages, demo, formats, text, observability and the showcase rows without server functions. */
export declare function prerenderedAppChecks(options: AppCheckOptions): void;
