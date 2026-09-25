# Localisation that proves the hard parts

Status: proposed 2026-09-25 under the owner's delegation; it builds on the
[TanStack move](done/tanstack.md), on main since release 0.9.0. Owner: remy-auth. Executor/Reviewer roles as in
[plans and roles](../docs/development.md#plans-and-roles).

## Why

English, Spanish and Arabic already prove right-to-left layout, six plural forms and the Paraglide
and TanStack wiring. They do not prove the parts that break real products: other calendars, other
digits, other week rules, words without spaces, casing that depends on the language, very long
words, script and region matching. The owner asked for languages that push those, and for the
system to show that it handles them.

## Evidence: what each candidate forces us to handle

Measured on 2026-09-25 with the same ICU data the Worker and the browser use (Node 26.10.0, V8):

| Language | What is hard | Measured |
| --- | --- | --- |
| Persian `fa` | Persian (solar) calendar by default, Persian digits by default, week starts Saturday, weekend Friday only, right to left | 12345678.9 → `۱۲٬۳۴۵٬۶۷۸٫۹`; calendar `persian`; week `{"firstDay":6,"weekend":[5]}` |
| Hebrew `he` | A `two` plural form, Hebrew calendar with Hebrew numerals, right to left | plurals one/two/other; `י״ד בתשרי תשפ״ז` |
| Thai `th` | Buddhist calendar by default, no spaces between words, stacked marks above and below | calendar `buddhist`; word segments `สวัสดี|ครับ|ยินดี|ต้อนรับ` |
| Japanese `ja` | Era calendar, no spaces between words, family name first, CJK fonts | `令和8年9月25日` |
| Traditional Chinese `zh-TW` | Republic of China calendar, script and region matching (`zh-Hant-HK`, `zh-CN`) | `民國115年9月25日` |
| Hindi `hi` | Indian digit grouping, Devanagari conjuncts | `1,23,45,678.9` |
| Amharic `am` | Ge'ez script, Ethiopian calendar | `15 መስከረም 2019 AM` |
| Polish `pl` | one/few/many/other with rules that are not obvious | 2 few, 5 many, 22 few, 25 many |
| Turkish `tr` | Dotted and dotless i in casing, its own sort order | `istanbul` uppercases to `İSTANBUL` only with the Turkish locale |
| German `de` | Long compound words and text expansion that overflow narrow layouts | a 42-letter compound noun |

Left out, because a chosen language already covers the same hard case: Welsh (six plural forms,
as Arabic), Russian (as Polish), Swedish sorting (as Turkish), Bengali digits (as Persian).
Together this makes 13 languages.

## What the system gains

Each item is shown on the formats or demo page and proven by a shared check.

1. **Each language's own calendar by default.** Persian pages show the Persian calendar, Thai the
   Buddhist one. The calendar control offers the era calendars (Japanese, Republic of China), Hebrew,
   Ethiopian and the Chinese lunar calendar.
2. **Native digits, in and out.** Numbers use the language's default digits. The demo form accepts
   seats typed in Persian or Arabic-Indic digits: a `type="number"` input rejects them today.
3. **Week rules from the locale.** First day of the week and weekend come from `Intl.Locale`
   week info (`getWeekInfo`), with a fallback where the browser lacks it (not Baseline yet).
4. **Plural coverage per language.** The existing catalog check already requires every plural form
   of each language; the formats page shows the Polish 22 and 25 cases.
5. **Casing by language.** Uppercased labels carry the page's `lang`, so Turkish gets `İ`. Checked.
6. **Words without spaces.** Thai and Japanese text breaks at word boundaries (`Intl.Segmenter`,
   and `word-break: auto-phrase` for Japanese where supported); the formats page counts words.
7. **Long words.** `hyphens: auto` with the page language. A new check loads every page in every
   language at 320 px wide and fails on horizontal overflow.
8. **Language matching.** Accept-Language `zh-Hant-HK` should reach `zh-TW`, and `zh-CN` should not.
   First verify what Paraglide's `preferredLanguage` strategy does with scripts and regions; use
   its options, and write nothing of our own unless it has no answer.
9. **Server and browser agree.** The existing no-JavaScript formats check already compares server
   output with the browser's `Intl`, which catches ICU differences between workerd and Chrome for
   the new calendars.
10. **Fonts.** Each new script gets its Noto font the way Arabic has one, loaded only on pages in
    that language; [fonts.css](../packages/ui/src/fonts.css) says how. The hands-on pass takes one
    screenshot per language to catch missing glyphs.

Name order (family name first in Japanese and Chinese) needs separate name fields in the shared
demo form. It is listed, but waits until a real app needs it.

## The formats page, regrouped

Today the page is thirteen cards in the order they were added: numbering sits under the calendar,
the local time is split from the other times, units and sorting come after the controls, and one
"Try other values" card changes values that live in three other cards. Adding ten languages makes
that worse, so the page is regrouped first, by the question a reader asks:

| Section | Answers | Holds |
| --- | --- | --- |
| This language | Which language and script is this? | Tag, own name, direction, script, available languages, casing sample |
| Dates and times | What day and time is it, and how is it written? | Calendar with its control, week rules, hour cycle, dates, ranges, relative time, the device's time zone, where you are and the local time there |
| Numbers | How are numbers written and read? | Digits, grouping, decimals, percentages, compact numbers, units, native-digit input |
| Money | How are amounts shown? | Currency with its control, amounts, decimals per currency |
| Words | How does text change with a value? | Plurals with the count control, ordinals, variants by value, lists, sorting, word breaks |

Rules for the regrouping:

- Each control sits in the section it changes, so a reader sees the result next to the control.
  The search-param names and the shareable addresses stay the same.
- One short line under each section heading says what it demonstrates.
- A short list of links to the five sections at the top of the page.
- Stock shadcn parts only (cards, the existing label/value rows), no new component.
- The shared formats check and the search-param checks keep their assertions; only the places
  they look change. The hands-on pass compares before and after screenshots at phone width.

## Translations

The new catalogs are machine-made by the agent. They are marked unreviewed in each catalog's
metadata and in the README until a native speaker reviews them. The checks prove structure,
plural coverage and formatting, not wording.

## Verified 2026-09-25 (work item 1)

- **Language matching.** Paraglide 2.25.4 has no script or region matching: it compares the whole
  tag, then the part before the first hyphen. `es-MX` and `fa-IR` already reach `es` and `fa`;
  `zh-Hant-HK` and `zh-HK` would not reach `zh-TW`. The fix inside Paraglide's own extension point
  is one custom strategy (`defineCustomServerStrategy` and `defineCustomClientStrategy`) placed before
  `preferredLanguage`, mapping Chinese through `Intl.Locale.prototype.maximize()` (Hant to `zh-TW`,
  Hans and plain `zh` to nothing) and leaving every other tag to Paraglide. **Decided 2026-09-25 (owner delegated, recommendation a):** add
  this strategy with the languages.
- **Week info.** `Intl.Locale.prototype.getWeekInfo()` is Baseline newly available since
  2026-07-21 and present in workerd; the deprecated `weekInfo` getter is never used. A fallback only
  matters for Firefox before 153 and Safari before 17. **Decided 2026-09-25 (owner delegated,
  recommendation a):** rely on Baseline, no fallback.
- **Calendars and digits.** workerd and Chrome carry every calendar (persian, buddhist, japanese,
  roc, hebrew, ethiopic, chinese, islamic) and numbering system tested and agree with each other;
  Node and Safari differ in places, so the evidence table above is re-measured in workerd. Locale
  tags name the calendar and digits explicitly (for example `fa-u-ca-persian-nu-arabext`,
  `th-u-ca-buddhist`). The Hebrew calendar in Hebrew uses year, month and day fields, not
  `dateStyle` (broken in Chrome and workerd); Hebrew numerals are not available, so that claim is
  dropped. During hydration the server's text is the source of truth: client code does not format
  it again.

## Work items, in order

1. **Verify (about 1 hour):** Paraglide's language matching for scripts and regions; `getWeekInfo`
   in Chrome, Safari, Firefox and workerd; which calendars and numbering systems workerd's ICU
   carries.
2. **Regroup the formats page** as above, on the existing three languages.
3. **System features 1 to 8** in the package, each with its shared check, on the existing three
   languages first.
4. **Catalogs** for the 10 new languages, added to Paraglide's settings. Parallel agents, one per
   two languages.
5. **Both apps** pick them up: new prefixes, prerendered pages in remy-auth-app, sitemap and
   hreflang.
6. **Gates and timing.** Level 1 grows with the language count, from about 35 seconds to an
   estimated 2 minutes; state the new timings in the task descriptions. Level 2 audits one page
   per script family, not every page in every language.
7. **Hands-on pass** on a preview deployment: every page in every language at phone width,
   screenshots, and notes on anything that reads wrong.
8. **Ship** as in the TanStack plan.

## Acceptance

- Every shared check passes in all 13 languages, locally and live.
- The formats page shows each language's default calendar and digits, and the demo accepts
  native digits.
- No page overflows at 320 px in any language.
- A screenshot of every page in every language shows no missing glyphs.
- The formats page has the five sections above, each control beside what it changes.
