# Formats page: every area for the page's language, every choice from the system

Closed 2026-09-26: built and live in 0.11.0 (locale-data, derived choices, formatsChecks over derived values).

Status: implemented 2026-09-25 (requirements 1 to 6; see Decisions). Owner's words:
"for each area it shows what each area is for the language you're in. The areas where you can try
out other things must also give you all the options based on the languages in the system. This
must not be done in a hardcoded way."

## Requirements

1. **Same shape in every area.** Each section (language, time, numbers, money, words, and fonts
   when [fonts.md](../fonts.md) lands) opens with what that area *is for the page's language*, then
   the samples, then (where there is one) the try-it control. No area is missing its "for this
   language" row in any of the 13 languages.
2. **The language's own values, derived, never listed.** Everything shown for the page's
   language comes from the locale itself: `Intl.Locale(locale).maximize()` (script, region),
   `getCalendars()`, `getNumberingSystems()`, `getHourCycles()`, `getWeekInfo()`,
   `Intl.DisplayNames`, Paraglide's locales and messages. Region-bound facts (currency) come from
   the maximized region through a standard source (CLDR data via the runtime, or a maintained
   package from a survey), not a table we write. **Assumed:** the runtime has no currency-for-region
   API; the agent checks and surveys.
3. **Try-it controls offer every language in the system.** The calendar, numbering, currency,
   count and (later) font choices are the union over Paraglide's `locales` of each language's own
   values, so adding a language adds its calendar, digits and currency to every page with no edit.
   Today `currencies` and `showcaseCalendars` in `showcase/search-params.tsx` are fixed lists;
   they go. The page's own language's values come first and are marked.
4. **One source of truth.** One module derives, per locale, everything the page and the controls
   need (extends `locale-info.ts`); the page, the Zod search schema (valid values) and the checks
   all read it.
5. **Checks follow the data.** `formatsChecks` iterates the derived values, not literals: every
   area has its "for this language" row in every locale; every locale's calendar, digits and
   currency appear as a choice; a new locale in `project.inlang` needs no check edit. Site page
   still complete without JavaScript (choices are links); Lighthouse and Core Web Vitals unchanged.
6. **Stock parts only.** Existing Row, Group and Choices built on shadcn; no new components by hand.

## For the agent

Read `packages/ui/src/pages.tsx` (FormatsContent), `showcase/search-params.tsx`, `locale-info.ts`,
`samples.js`, `checks.js` (formatsChecks), [hard-localisation.md](hard-localisation.md) and
[fonts.md](../fonts.md). Deliver: an inventory of every area and control with what is derived and what
is hardcoded today, a survey for region data (currency), a design against requirements 1 to 6,
and milestones with gates. Owner decisions only if a choice costs money or changes what Google sees.

## Decisions (2026-09-25)

- **Inventory before.** Hardcoded: `currencies` (EUR USD GBP JPY KWD), `countChoices`
  (0 1 2 3 11 100 1000) and `showcaseCalendars` in `showcase/search-params.tsx`; the Money row
  (euros, in the `currency_value` message); `searchDefaults`; the checks' own copies of all of these.
  Words had no "for this language" row. Derived already: language, calendar, hour cycle, week, digits.
- **Survey, currency for region.** Runtime first: `Intl.Locale` has no currency getter (Node 26,
  workerd; `Intl.supportedValuesOf('currency')` lists codes, not regions). Packages:
  `cldr-core` (authoritative supplemental currencyData, 1.7 MB, too big for every page's entry
  chunk), `currency-codes` (ISO 4217 by country *name*, last release 2024), `locale-currency`
  (one 2025 release), `country-to-currency` 3.0.1 (ISO 3166 alpha-2 to ISO 4217, MIT, released
  2026-06, 16 kB unpacked, already has Bulgaria on EUR). Chosen: `country-to-currency`, keyed by
  `Intl.Locale(locale).maximize().region`.
- **One source, plain JavaScript.** `packages/ui/src/locale-data.js` (+ `.d.ts`) derives each
  locale's own values and every control's choices; `locale-info.ts` re-exports it and adds
  `region`, `currency`, `counts` to `LocaleInfo`. Plain JavaScript because the shared checks load
  from `node_modules` untranspiled, and they must read the same module (requirement 4).
- **Counts** are each plural form's smallest whole number up to `maxCount` (Intl.PluralRules), so
  the control shows every form of every language (0 1 2 3 11 100 today). `samples.counts` (the
  plurals badges) stays a fixed sample set with Polish 22 and 25.
- **Numbering** became a control (`?numbering=`); today the union is `latn` and `arabext` because
  CLDR's default for Arabic is Latin digits.
- **Defaults** come from the base locale: its currency (USD), calendar, digits, and its first count
  above one in the general form (2). The default count is always a choice.
- **Marking** the page's own values: first in the list, shadcn's `secondary` button look, and
  `aria-describedby` a secondary Badge reading the existing `section_language` message ("This
  language"); no new messages.
- **Left open:** `samples.currencies` (JPY, KWD, the "same amount in other currencies" row) is a
  minor-unit demonstration, not a choice list; `currency_value` and `currency_label` messages are no
  longer used by the page and stay in the catalog for consumers; fonts (fonts.md) not yet an area.
