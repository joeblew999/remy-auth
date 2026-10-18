// What each language in the system brings to the formats page, derived, never listed: its region,
// script, calendars and digits from the runtime's CLDR data (Intl.Locale maximize, getCalendars,
// getNumberingSystems), its plural forms from Intl.PluralRules, and its currency from its region.
// The runtime has no currency-for-region API, so the region's currency comes from
// country-to-currency (ISO 3166 to ISO 4217, maintained; surveyed in the formats-consistency plan: https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/formats-consistency.md).
// Packed (vite.config.ts) like ./samples.ts, so the page (through ./locale-info), the formats search schema
// and the shared Playwright checks read the same module. Adding a locale to project.inlang adds its
// calendar, digits, currency and plural forms to every page and check with no other edit.
import countryToCurrency from 'country-to-currency';
import { locales, baseLocale } from '@joeblew999/remy-ui/runtime';
import type { Locale } from '@joeblew999/remy-ui/runtime';

/** One language's own values, derived from the runtime's CLDR data and its region's currency. */
export type OwnValues = {
  region: string;
  script: string;
  currency: string;
  calendars: string[];
  numberingSystems: string[];
  counts: number[];
};
/** The formats page's try-it controls, each a search param. */
export type ChoiceKind = 'calendar' | 'numbering' | 'currency' | 'count';
type ChoiceValue<K extends ChoiceKind> = K extends 'count' ? number : string;
/** Intl.Locale's CLDR lists (newer than the TypeScript lib this project targets). */
type LocaleInfo = Intl.Locale & { getCalendars(): string[]; getNumberingSystems(): string[] };

/** The largest count the formats page takes in its address. */
export const maxCount: number = 1000;

const cache = new Map<Locale, OwnValues>();

/** The smallest whole number from 0 to maxCount that each of this language's plural forms selects, ascending. */
function pluralCounts(locale: Locale): number[] {
  const rules = new Intl.PluralRules(locale);
  const found = new Map<Intl.LDMLPluralRule, number>();
  for (let n = 0; n <= maxCount && found.size < rules.resolvedOptions().pluralCategories.length; n++) {
    const form = rules.select(n);
    if (!found.has(form)) found.set(form, n);
  }
  return [...found.values()].sort((a, b) => a - b);
}

/** Unicode's script for a CLDR script code: Japanese and both Chinese are written with Han digits. */
const unicodeScript = (script: string): string =>
  ({ Jpan: 'Hani', Hans: 'Hani', Hant: 'Hani', Kore: 'Hang' } as Record<string, string>)[script] ?? script;

/**
 * The digit systems written in a script: every numbering system the runtime formats with (Intl), whose
 * digits are that script's (Unicode's Script_Extensions). CLDR's "native" digits, which Intl does not
 * expose: Thai for th, Devanagari for hi, Han for ja and zh-TW, Arabic-Indic for ar. Scripts whose
 * numerals are letters (Hebrew, Ethiopic) have none.
 */
let digitsBySystem: [system: string, digits: string][] | undefined;
function scriptDigits(script: string): string[] {
  // Each numbering system's digits, formatted once per process (about a hundred formatters), then only
  // tested against each script: building them per language cost the page 0.7 s on a phone (release
  // 0.12.0's Core Web Vitals run).
  digitsBySystem ??= Intl.supportedValuesOf('numberingSystem')
    .map((system): [string, string] => [
      system,
      new Intl.NumberFormat(`en-u-nu-${system}`, { useGrouping: false }).format(1234567890),
    ])
    .filter(([, digits]) => digits !== '1234567890');
  const own = new RegExp(`^\\p{Script_Extensions=${unicodeScript(script)}}+$`, 'u');
  return digitsBySystem.filter(([, digits]) => own.test(digits)).map(([system]) => system);
}

/** This language's own values: region, script, currency, calendars, digits and plural counts, its preferred first. */
export function ownValues(locale: Locale): OwnValues {
  if (!cache.has(locale)) {
    const tag = new Intl.Locale(locale) as LocaleInfo;
    // maximize() always gives a language's likely region and script.
    const { region, script } = tag.maximize() as Intl.Locale & { region: string; script: string };
    cache.set(locale, {
      region,
      script,
      currency: countryToCurrency[region as keyof typeof countryToCurrency],
      calendars: tag.getCalendars(),
      // Its default digits first, then the other digits written in its script.
      numberingSystems: [...new Set([...tag.getNumberingSystems(), ...scriptDigits(script)])],
      counts: pluralCounts(locale),
    });
  }
  return cache.get(locale) as OwnValues;
}

/** The formats page's try-it controls, each a search param. */
export const choiceKinds: ChoiceKind[] = ['calendar', 'numbering', 'currency', 'count'];

const valuesOf: { [K in ChoiceKind]: (own: OwnValues) => ChoiceValue<K>[] } = {
  calendar: (own) => own.calendars,
  numbering: (own) => own.numberingSystems,
  currency: (own) => [own.currency],
  count: (own) => own.counts,
};

/** Every value of a control over all of Paraglide's locales, in locale order (counts ascending). */
export function allChoices<K extends ChoiceKind>(kind: K): ChoiceValue<K>[] {
  const all = [...new Set(locales.flatMap((locale) => valuesOf[kind](ownValues(locale))))];
  // The default count is always a choice, so the plain page has its count marked too.
  return kind === 'count'
    ? ([...new Set([...(all as number[]), searchDefaults.count])].sort((a, b) => a - b) as ChoiceValue<K>[])
    : all;
}

/** A control's choices on this language's page: its own values first, then every other language's. */
export function choicesFor<K extends ChoiceKind>(
  locale: Locale,
  kind: K,
): { own: ChoiceValue<K>[]; others: ChoiceValue<K>[] } {
  const own = valuesOf[kind](ownValues(locale));
  return { own, others: allChoices(kind).filter((value) => !own.includes(value)) };
}

const base = ownValues(baseLocale);
const baseRules = new Intl.PluralRules(baseLocale);
/**
 * The values the page shows with no search params: the base locale's own calendar, digits and
 * currency, and its first count above one written in its general ("other") plural form.
 */
export const searchDefaults: { currency: string; count: number; calendar: string; numbering: string } = {
  currency: base.currency,
  count:
    Array.from({ length: maxCount - 1 }, (_, index) => index + 2).find((n) => baseRules.select(n) === 'other') ??
    maxCount,
  calendar: base.calendars[0],
  numbering: base.numberingSystems[0],
};
