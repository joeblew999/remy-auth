# Formats page: every area for the page's language, every choice from the system

Status: requirements only, 2026-09-25; an agent analyses and designs later. Owner's words:
"for each area it shows what each area is for the language you're in. The areas where you can try
out other things must also give you all the options based on the languages in the system. This
must not be done in a hardcoded way."

## Requirements

1. **Same shape in every area.** Each section (language, time, numbers, money, words, and fonts
   when [fonts.md](fonts.md) lands) opens with what that area *is for the page's language*, then
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
[fonts.md](fonts.md). Deliver: an inventory of every area and control with what is derived and what
is hardcoded today, a survey for region data (currency), a design against requirements 1 to 6,
and milestones with gates. Owner decisions only if a choice costs money or changes what Google sees.
