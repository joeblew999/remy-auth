// Paraglide's `preferredLanguage` compares a whole tag, then the part before the first hyphen, so
// es-MX and fa-IR already reach es and fa, but zh-Hant-HK and zh-HK would never reach zh-TW
// (.plans/hard-localisation.md, "Verified 2026-09-25"). The fix inside Paraglide's own extension
// point: one custom strategy, `custom-chinese`, placed before `preferredLanguage` in paraglide.mjs.
// It answers only for Chinese written in Traditional characters (Intl.Locale's maximize() gives the
// script: zh-HK → zh-Hant-HK), mapping it to zh-TW when that is a configured locale; Simplified
// and plain `zh` get nothing, and every other tag is left to Paraglide.
// Plain JavaScript, like paths.js, so the shared checks (checks.js) can import it too.
import { locales, strategy, defineCustomServerStrategy, defineCustomClientStrategy, extractLocaleFromRequestWithStrategies,
  extractLocaleFromHeader, extractLocaleFromNavigator } from './paraglide/runtime.js';

export const chineseStrategy = 'custom-chinese';

/** Accept-Language's tags, most preferred first, in the order Paraglide's preferredLanguage reads them. */
export function acceptLanguageTags(header) {
  return (header ?? '').split(',').map((part, index) => {
    const [tag = '', q = '1'] = part.trim().split(';q=');
    return { tag: tag.trim(), q: Number(q), index };
  }).filter(entry => entry.tag && entry.tag !== '*').sort((a, b) => b.q - a.q || a.index - b.index).map(entry => entry.tag);
}

export function matchChinese(tags, available = locales) {
  const known = value => available.some(locale => locale.toLowerCase() === value.toLowerCase());
  for (const tag of tags) {
    let parsed;
    try { parsed = new Intl.Locale(tag); } catch { continue; }
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
function answeredEarlier(request) {
  try { extractLocaleFromRequestWithStrategies(request, earlier); return true; } catch { return false; }
}

defineCustomServerStrategy(chineseStrategy, {
  getLocale: request => request && !answeredEarlier(request) ? matchChinese(acceptLanguageTags(request.headers.get('accept-language'))) : undefined,
});
// The browser resolves strategies in their order, so the URL and the cookie already come first there.
defineCustomClientStrategy(chineseStrategy, {
  getLocale: () => typeof navigator === 'undefined' ? undefined : matchChinese(navigator.languages ?? []),
  setLocale: () => {},
});

export function preferredFromHeader(request) {
  return matchChinese(acceptLanguageTags(request.headers.get('accept-language'))) ?? extractLocaleFromHeader(request);
}

export function preferredFromNavigator() {
  return matchChinese(navigator.languages ?? []) ?? extractLocaleFromNavigator();
}
