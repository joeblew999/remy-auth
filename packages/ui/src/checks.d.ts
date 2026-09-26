import type { Locator, Page } from '@playwright/test';
export declare const endonym: (locale: string) => string;
export declare const direction: (locale: string) => 'ltr' | 'rtl';
export declare const localizedPath: (path: string, locale: string) => string;
/** Every locale, or the subset in CHECK_LOCALES. */
export declare const checkedLocales: readonly string[];
export declare function collectErrors(page: Page): string[];
/** Resolves once React has hydrated the element. */
export declare function hydrated(locator: Locator): Promise<void>;
/**
 * `oneLanguage`: site pages in one language only, listed once in the sitemap without alternates; its
 * `translations` (path to languages, that language first) lists a translated page in each, with alternates.
 */
export type OneLanguage = { locale: string; paths: string[]; translations?: Record<string, string[]> };
/** `sitemap: false` leaves the sitemap to the seo-routes part's checks (sitemapChecks). */
export declare function publicPageChecks(options: { paths: string[]; prerendered?: boolean; oneLanguage?: OneLanguage; sitemap?: boolean }): void;
/** The sitemap lists `paths` in every locale and `oneLanguage`'s pages, self-canonical with hreflang alternates; robots.txt names it. */
export declare function sitemapChecks(options: { paths: string[]; oneLanguage?: OneLanguage }): void;
export declare function entryChecks(options: { paths: string[]; mode: 'redirect' | 'static' }): void;
export declare function demoChecks(): void;
/** Site pages work without JavaScript and are indexable; app pages are noindex and out of the sitemap. */
export declare function zoneChecks(options: { sitePaths: string[]; appPaths: string[] }): void;
export declare function formatsChecks(options?: { extra?: (page: Page, locale: string) => Promise<void> }): void;
export declare function lighthouseChecks(options: { pages: { path: string; device: 'mobile' | 'desktop' }[] }): void;
export declare function performanceChecks(options: { pages: { path: string; device: 'mobile' | 'desktop' }[]; thresholds?: { score?: number; lcp?: number; cls?: number; tbt?: number }; runs?: number }): void;
/** The locale with its own calendar and digits named explicitly (fa → fa-u-ca-persian-nu-arabext). */
export declare const formatTag: (locale: string) => string;
/** Every page at 320 px in every language, hyphenation, casing by language and Japanese phrase breaks (text.css). */
export declare function textChecks(options: { paths: string[] }): void;
/** Scripts fonts.css leaves to the system's font on purpose (Han): their web fonts are over fontBudget. */
export declare const systemFontScripts: string[];
/** The most font bytes a first visit to one site page may download, in every language (300 KB). */
export declare const fontBudget: number;
/** The fonts that draw each language's heading and intro are the ones fonts.css names for it (Chrome DevTools Protocol), or for a Han page the system's font for its language; any other system font drawing the page's script fails naming the script; each Han language is drawn by its own font; a first visit to each page downloads at most `budget` bytes of fonts (default fontBudget). */
export declare function fontChecks(options: { paths: string[]; selectors?: string[]; budget?: number }): void;
export declare function observabilityChecks(options: { service: string; paths: string[] }): void;
/** A strict nonce CSP, enforced unless `enforce: false` (report-only): one nonce policy under that mode's header only, every page's scripts carry the response's nonce, no page violates it, enforced it blocks and reports a script without the nonce, the report endpoint answers. */
export declare function cspChecks(options: { paths: string[]; reportPath?: string; enforce?: boolean }): void;
