// Paraglide's `preferredLanguage` compares a whole tag, then the part before the first hyphen, so
// es-MX and fa-IR already reach es and fa, but zh-Hant-HK and zh-HK would never reach zh-TW
// (plan: https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/hard-localisation.md, "Verified 2026-09-25"). The fix inside Paraglide's own extension
// point: one custom strategy, `custom-chinese`, placed before `preferredLanguage` in paraglide.mjs.
// It answers only for Chinese written in Traditional characters (Intl.Locale's maximize() gives the
// script: zh-HK → zh-Hant-HK), mapping it to zh-TW when that is a configured locale; Simplified
// and plain `zh` get nothing, and every other tag is left to Paraglide.
// Packed (vite.config.ts), like paths.ts, so the shared checks (checks.ts) can import it too.
import {
  locales,
  strategy,
  defineCustomServerStrategy,
  defineCustomClientStrategy,
  extractLocaleFromRequestWithStrategies,
  extractLocaleFromHeader,
  extractLocaleFromNavigator,
} from '@joeblew999/remy-ui/runtime';
import type { Locale } from '@joeblew999/remy-ui/runtime';

/** The custom strategy's name in paraglide.mjs's `strategy` list; importing this module registers it on server and browser. */
export const chineseStrategy = 'custom-chinese' as const;

/** Accept-Language's tags, most preferred first, in the order Paraglide's preferredLanguage reads them. */
export function acceptLanguageTags(header: string | null | undefined): string[] {
  return (header ?? '')
    .split(',')
    .map((part, index) => {
      const [tag = '', q = '1'] = part.trim().split(';q=');
      return { tag: tag.trim(), q: Number(q), index };
    })
    .filter((entry) => entry.tag && entry.tag !== '*')
    .sort((a, b) => b.q - a.q || a.index - b.index)
    .map((entry) => entry.tag);
}

/**
 * zh-TW when the first of the visitor's languages (most preferred first) that this project can serve
 * is Chinese in Traditional script and `available` (default: the configured locales) has zh-TW.
 * Undefined otherwise, including when an earlier language is one Paraglide matches itself.
 */
export function matchChinese(tags: readonly string[], available: readonly string[] = locales): Locale | undefined {
  const known = (value: string): boolean => available.some((locale) => locale.toLowerCase() === value.toLowerCase());
  for (const tag of tags) {
    let parsed;
    try {
      parsed = new Intl.Locale(tag);
    } catch {
      continue;
    }
    if (parsed.language === 'zh') {
      if (known(tag)) return undefined;
      return parsed.maximize().script === 'Hant' && known('zh-TW') ? 'zh-TW' : undefined;
    }
    // A language Paraglide matches itself (its whole tag or its first part) comes first: its answer stands.
    if (known(tag) || known(parsed.language)) return undefined;
  }
  return undefined;
}

// Paraglide's server runs custom strategies before all others (extractLocaleFromRequestAsync), so
// the strategy steps aside whenever a strategy listed before it (the URL, the cookie) answers.
const position = strategy.indexOf(chineseStrategy);
const earlier = position < 0 ? [] : strategy.slice(0, position);
function answeredEarlier(request: Request): boolean {
  try {
    extractLocaleFromRequestWithStrategies(request, earlier);
    return true;
  } catch {
    return false;
  }
}

defineCustomServerStrategy(chineseStrategy, {
  getLocale: (request) =>
    request && !answeredEarlier(request)
      ? matchChinese(acceptLanguageTags(request.headers.get('accept-language')))
      : undefined,
});
// The browser resolves strategies in their order, so the URL and the cookie already come first there.
defineCustomClientStrategy(chineseStrategy, {
  getLocale: () => (typeof navigator === 'undefined' ? undefined : matchChinese(navigator.languages ?? [])),
  setLocale: () => {},
});

/** The visitor's preferred language from Accept-Language: the Chinese strategy's answer, else Paraglide's. */
export function preferredFromHeader(request: Request): Locale | undefined {
  return matchChinese(acceptLanguageTags(request.headers.get('accept-language'))) ?? extractLocaleFromHeader(request);
}

/** The visitor's preferred language from the browser's languages: the Chinese strategy's answer, else Paraglide's. */
export function preferredFromNavigator(): Locale | undefined {
  return matchChinese(navigator.languages ?? []) ?? extractLocaleFromNavigator();
}
