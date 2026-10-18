import type { Locale } from './paraglide/runtime.js';
/** The custom strategy's name in paraglide.mjs's `strategy` list; importing this module registers it on server and browser. */
export declare const chineseStrategy: 'custom-chinese';
/** Accept-Language's tags, most preferred first. */
export declare function acceptLanguageTags(header: string | null | undefined): string[];
/**
 * zh-TW when the first of the visitor's languages (most preferred first) that this project can serve
 * is Chinese in Traditional script and `available` (default: the configured locales) has zh-TW.
 * Undefined otherwise, including when an earlier language is one Paraglide matches itself.
 */
export declare function matchChinese(tags: readonly string[], available?: readonly string[]): Locale | undefined;
/** The visitor's preferred language from Accept-Language: the Chinese strategy's answer, else Paraglide's. */
export declare function preferredFromHeader(request: Request): Locale | undefined;
/** The visitor's preferred language from the browser's languages: the Chinese strategy's answer, else Paraglide's. */
export declare function preferredFromNavigator(): Locale | undefined;
