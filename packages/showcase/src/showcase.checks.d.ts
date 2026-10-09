import type { Page } from '@playwright/test';

/** Every showcase check (the demo, formats, app navigation, search params, preload, leave guard, device place), for an app showing the showcase pages. */
export declare function showcaseChecks(options: {
  /** The app's name, which the pages say: its defineRemyApp `brand`. */
  product: string;
  /** 'server' (TanStack Start renders each request, default) or 'prerendered' (no server functions). */
  rendering?: 'server' | 'prerendered';
  /** Rows only this app's formats page has. */
  formats?: { extra?: (page: Page, locale: string) => Promise<void> };
  /** Where the device-place row is (default /app/location). */
  devicePath?: string;
  /** The network place beside the device's (the deferred-place part is listed). */
  network?: boolean;
}): void;
export declare function demoChecks(): void;
export declare function appNavChecks(): void;
export declare function formatsChecks(options: { product: string; extra?: (page: Page, locale: string) => Promise<void> }): void;
/** The Settings page's product-name samples and what it says is deployed. */
export declare function settingsChecks(options: { product: string }): void;
