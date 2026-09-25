import type { Locator, Page } from '@playwright/test';
export declare const endonym: (locale: string) => string;
export declare const direction: (locale: string) => 'ltr' | 'rtl';
export declare const localizedPath: (path: string, locale: string) => string;
/** Every locale, or the subset in CHECK_LOCALES. */
export declare const checkedLocales: readonly string[];
export declare function collectErrors(page: Page): string[];
/** Resolves once React has hydrated the element. */
export declare function hydrated(locator: Locator): Promise<void>;
export declare function publicPageChecks(options: { paths: string[]; prerendered?: boolean }): void;
export declare function entryChecks(options: { paths: string[]; mode: 'redirect' | 'static' }): void;
export declare function demoChecks(): void;
/** Site pages work without JavaScript and are indexable; app pages are noindex and out of the sitemap. */
export declare function zoneChecks(options: { sitePaths: string[]; appPaths: string[] }): void;
export declare function formatsChecks(options?: { extra?: (page: Page, locale: string) => Promise<void> }): void;
export declare function lighthouseChecks(options: { pages: { path: string; device: 'mobile' | 'desktop' }[] }): void;
export declare function performanceChecks(options: { pages: { path: string; device: 'mobile' | 'desktop' }[]; thresholds?: { score?: number; lcp?: number; cls?: number; tbt?: number }; runs?: number }): void;
export declare function observabilityChecks(options: { service: string; paths: string[] }): void;
