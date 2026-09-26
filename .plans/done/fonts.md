# Fonts per writing system (quick plan)

Closed 2026-09-26: script fonts before Geist\'s fallback, `fontChecks` (the web font that draws each language, a 300 KB font budget per page), Japanese and Traditional Chinese on system fonts, Persian on Vazirmatn; 496 font files down to 25; live. Left as a line in now.md: font rows on the formats page (step 4).

Status: open. Built 2026-09-25: the stack fix (step 2) and `fontChecks` (step 3). Measured and
decided 2026-09-26: step 1 and the three decisions of step 5 (see "Step 1: measured" and
"Decisions" below, delegated by the owner). Step 4 (fonts rows on the formats page) remains. Owner's question: "as we add more languages
then fonts need to be downloaded? ... it's tempting to align the adding of a language with a font
download but I doubt it's that simple ... Tempting to also show the fonts aspect in the formats gui
control". Builds on [hard localisation](hard-localisation.md) item 10 and the fonts rule in
[fonts.css](../../packages/ui/src/fonts.css). Checked 2026-09-25 against the installed packages
(fontsource 5.3.0, fontaine 1.0.0, the built `dist/`), MDN, CSS Fonts 4, the Chrome DevTools
Protocol and Cloudflare's docs. Anything else is marked **assumed**.

## Answer in one paragraph

No: a language does not map to a font. A **writing system (script)** maps to a font, and the
script comes from the locale itself: `new Intl.Locale(l).maximize().script` gives `Latn` for en, es,
pl, tr and de, `Arab` for ar and fa, `Hebr`, `Thai`, `Jpan`, `Hant`, `Deva`, `Ethi` for the rest
(measured on our 13 locales). Five of our 13 languages need no font beyond Geist. Han is the one
place where the *language* matters inside a script: ja and zh-TW draw the same code points with
different glyph shapes, so each needs its own font. Adding a language therefore either needs
nothing (its script is covered) or needs one font for a new script, and a check can say which.

## Checked facts

1. **unicode-range already limits downloads.** "If the page doesn't use any character in this
   range, the font is not downloaded" ([MDN unicode-range](https://developer.mozilla.org/en-US/docs/Web/CSS/@font-face/unicode-range)).
   Fontsource's default CSS relies on this "to only load the characters that are used on the page"
   ([fontsource subsets](https://fontsource.org/docs/getting-started/subsets)). Our packages ship
   `font-display: swap` (read in `noto-sans-jp/index.css`).
2. **Fallback is per character.** The browser walks the family list "until it matches an available
   font that contains a glyph for the character"; after the list, the platform's own fallback
   draws it ([CSS Fonts 4, font matching](https://www.w3.org/TR/css-fonts-4/#font-matching-algorithm)).
   So a missing font is usually not tofu; it is the system's font, in the system's style.
3. **Our Arabic and Hebrew fonts are declared but not used on macOS and Windows.** Every `:lang()`
   stack reads `'Geist Variable', 'Geist Variable fallback', 'Noto Sans … Variable'`. fontaine's
   `Geist Variable fallback` is `src: local(Arial)` with no `unicode-range` (read in
   `dist/client/assets/index-*.css`). Arial carries Arabic and Hebrew, so it wins before Noto; the
   hard-localisation plan recorded this ("Arabic, Persian and Hebrew draw with the system's Arial").
   CJK, Thai, Devanagari and Ethiopic reach Noto because Arial lacks them (**assumed** for Thai on
   every platform). This is the concrete proof that "language = font" is not what happens today.
4. **fontaine also generates `Noto Sans Arabic Variable fallback` faces** (metric-matched), but
   fonts.css never names them, so script-font swaps have no size-adjusted fallback (CLS risk).
5. **Bytes on disk (woff2, weight axis, fontsource 5.3.0):**

   | Font | Script | Slices | All slices |
   | --- | --- | --- | --- |
   | Geist | Latin, Cyrillic, Vietnamese | 5 | 76 KB |
   | Noto Sans Hebrew | Hebr | 5 | 46 KB |
   | Noto Sans Thai | Thai | 3 | 74 KB |
   | Noto Sans Devanagari | Deva | 3 | 160 KB |
   | Noto Sans Ethiopic | Ethi | 3 | 247 KB |
   | Noto Sans Arabic | Arab | 5 | 251 KB |
   | Noto Sans TC | Hant | 105 | 4.2 MB |
   | Noto Sans JP | Jpan | 124 | 5.2 MB |

   A CJK page downloads only the slices holding its characters: measured 2026-09-26, 16 to 31
   slices, 322 KB to 1,147 KB of Noto per page (step 1 below).
6. **Workers limits are not the constraint.** 20,000 asset files per version on Free, 100,000 on
   Paid, 25 MiB per file ([Workers limits](https://developers.cloudflare.com/workers/platform/limits/#static-assets)).
   Today's build has 564 files, 496 of them woff2. Each new CJK font adds about 100 to 130 files.
7. **The rendering font is observable.** CDP `CSS.getPlatformFontsForNode` returns, per node,
   `familyName`, `postScriptName`, `isCustomFont` ("downloaded or resolved locally") and
   `glyphCount` (installed `devtools-protocol`). In the page, `document.fonts` lists each face with
   its `status` (`unloaded`, `loading`, `loaded`) but not which face drew which glyph.
8. **System fonts are usually good enough for coverage, not for sameness.** macOS, Windows, Android
   and iOS all ship fonts for our 8 scripts (**assumed**; confirm against Microsoft's
   [Windows font list](https://learn.microsoft.com/en-us/typography/fonts/windows_11_font_list) and
   Apple's font lists). Linux desktops without Noto CJK show tofu (**assumed**). What a web font buys
   is the same look and metrics everywhere, and the right Han glyphs when the OS locale differs
   (CSS Fonts 4 notes `lang="ja"` may not change the system font "in Chinese locale").
9. **Style differs within a script.** Persian readers often prefer a Persian-designed face
   (for example Vazirmatn) over Noto Sans Arabic (**assumed**; a native-reader question for the
   owner, as the catalogs are).

## One source of truth

- **Script per locale:** derived, not written: `Intl.Locale(l).maximize().script` from CLDR. No new
  metadata field.
- **Font per script (and per Han language):** one table, in fonts.css itself as it is today (one
  `:lang()` rule per language that needs a web font). Latin needs no rule.
- **The check** (`fontChecks`, shared, beside `textChecks`): for every locale, load `/xx` and
  `/xx/formats`, take the main text nodes and call `CSS.getPlatformFontsForNode`. Fail when
  1. any glyph of the page's own script is drawn by a font that is not `isCustomFont` (the system
     font stepped in), naming the locale, the script and "add a font for script X to fonts.css"; or
  2. a Han page is drawn by the other Han language's font (ja by TC, zh-TW by JP); or
  3. a font is named but never used (today's Arabic and Hebrew) or a face named in CSS is never
     loaded (the existing rule).
  Tofu is caught by (1) too: macOS draws missing glyphs with `LastResort` (**assumed**; verify).
  Adding a Latin-script language passes with no change; adding Greek or Korean fails with the
  missing script named.

## Cost policy

- Only the page's language gets its script font (today's `html:lang()` rules; keep them).
- **No preload for script fonts.** A preload fetches a whole slice whether used or not, and which
  CJK slices a page needs is not known ahead. Geist stays as is.
- Script fonts get fontaine's metric-matched fallback in their stack, so the swap moves nothing
  (fixes finding 4); CLS stays under 0.1.
- LCP: the LCP element is text; `font-display: swap` paints it in the fallback first, so a web font
  should not move LCP (**assumed**; measure `/ja/formats` and `/ar/formats` mobile with
  `project:test:cwv`). Level 2 audits one page per script family (hard-localisation item 6).
- Budget: bytes of font per page recorded by the check; a CJK page over a limit the owner sets
  (proposal: 600 KB) fails.

## Fonts in the formats GUI

In the "This language" section, three rows, stock `Row`/`Group` and `Badge` only:

| Row | Server-rendered (no JavaScript) | In the browser |
| --- | --- | --- |
| Script | `Arabic (Arab)` from `maximize().script` and `Intl.DisplayNames(type: 'script')` | same |
| Font | the family fonts.css names for this language, or "system font" | the family actually loaded, from `document.fonts` (`status === 'loaded'` for this family) |
| Font files | — | slices loaded and their bytes, from `performance.getEntriesByType('resource')` for `.woff2` |

The browser values fill in after hydration (the server text stays the source of truth, as in the
hard-localisation plan); no new component.

## Survey

Criteria, weighted: upstream-owned (3), no custom code (3), works on workers.dev (2),
correctness per script and Han language (3), cost to the visitor (2). Scores 0 to 2, total out of 26; sources above.

| Approach | Upstream | No code | workers.dev | Correct | Cost | Total |
| --- | --- | --- | --- | --- | --- | --- |
| A. System fonts only for non-Latin (drop Noto) | 2 | 2 | 2 | 0 (Han variants, Linux tofu, looks differ) | 2 | 20 |
| B. Today: fontsource per script, `:lang()` rules, fix fallback order | 2 | 2 | 2 | 2 | 1 | 24 |
| C. Google Fonts CSS2 API (hosted, sliced) | 2 | 2 | 1 (third-party origin, CSP, privacy) | 2 | 1 | 22 |
| D. Build-time subsetting to the catalog's characters (glyphhanger, subfont) | 1 | 0 | 2 | 1 (user input and dates break it) | 2 | 14 |
| E. Language-to-font table in code | 0 | 0 | 2 | 1 | 1 | 9 |

**Recommendation: B**, with finding 3 and 4 fixed and the check added. Runner-up **A**: switch if
the budget cannot hold CJK or the owner prefers native system looks; the check then asserts "system
font has glyphs" instead of `isCustomFont`. Prove B and A with scratch builds of `/ja/formats` and
`/ar/formats` (bytes, LCP, CLS, screenshots) before deciding, as [how we work](../../docs/how-we-work.md#choose-tools-by-survey-not-by-first-find) asks.

## Step 1: measured (2026-09-26)

How: a local production build (`vite build`, then `wrangler dev --local` on port 4320), Chromium
from the pinned Playwright, a fresh browser context per page (cold cache, a first visit), waiting
for network idle and `document.fonts.ready`. Bytes are what the browser received for every woff2
file (CDP `Network.loadingFinished` before the change; resource timing's `encodedBodySize`, which is
what the check reads, after; the two differ by the response headers, under 0.5 KB). Fonts drawing
the heading and intro from CDP `CSS.getPlatformFontsForNode`. LCP and CLS from the page's own
`PerformanceObserver`, desktop, unthrottled, local: for spotting regressions, not Core Web Vitals.

| Locale | Script | `/` before | `/formats` before | `/` after | `/formats` after | Drawn by (after) |
| --- | --- | --- | --- | --- | --- | --- |
| en | Latn | 28.9 KB (1) | 28.9 KB (1) | 28.7 KB | 28.7 KB | Geist |
| es | Latn | 28.9 KB (1) | 28.9 KB (1) | 28.7 KB | 28.7 KB | Geist |
| pl | Latn | 45.2 KB (2) | 45.2 KB (2) | 44.8 KB | 44.8 KB | Geist (latin, latin-ext) |
| tr | Latn | 45.2 KB (2) | 45.2 KB (2) | 44.8 KB | 44.8 KB | Geist (latin, latin-ext) |
| de | Latn | 28.9 KB (1) | 28.9 KB (1) | 28.7 KB | 28.7 KB | Geist |
| ar | Arab | 191.1 KB (2) | 227.9 KB (4) | 190.8 KB | 227.2 KB | Noto Sans Arabic, Geist |
| fa | Arab | 191.1 KB (2) | 258.8 KB (5) | **73.9 KB** | **107.6 KB** | Vazirmatn, Geist |
| he | Hebr | 41.0 KB (2) | 57.4 KB (3) | 40.7 KB | 56.8 KB | Noto Sans Hebrew, Geist |
| th | Thai | 55.4 KB (2) | 55.4 KB (2) | 55.0 KB | 55.0 KB | Noto Sans Thai, Geist |
| ja | Jpan | 351.0 KB (17) | 620.0 KB (32) | **28.7 KB** | **28.7 KB** | Hiragino Kaku Gothic ProN (system), Geist |
| zh-TW | Hant | 948.8 KB (15) | 1175.6 KB (18) | **28.7 KB** | **28.7 KB** | PingFang TC (蘋方-繁, system), Geist |
| hi | Deva | 147.4 KB (2) | 163.7 KB (3) | 147.1 KB | 163.2 KB | Noto Sans Devanagari, Geist |
| am | Ethi | 222.7 KB (2) | 222.7 KB (2) | 222.4 KB | 222.4 KB | Noto Sans Ethiopic, Geist |

(n) is the number of font files. Geist's Latin slice is 28.7 KB on every page; the rest is the
script's font. Findings:

- **Han is the only outlier.** Noto Sans TC's slices are about 70 KB each (JP's about 16 KB), so
  zh-TW downloads 920 KB to 1,147 KB of Noto for one heading, an intro and the formats table. Every
  other page stays at or under 259 KB.
- **The Latin-slice cost (the open cost in "Done so far") is real on two pages:** `/ar/formats`
  pulls Noto Sans Arabic's `symbols` (14.2 KB) and `math` (22.2 KB) slices, and `/fa/formats` pulled
  its `latin` slice (30.9 KB), now Vazirmatn's `latin` (33.7 KB): characters on the formats page
  Geist does not have. Under budget; left as is.
- **System Han fonts keep the Han variants apart.** With no rule for ja and zh-TW, Chrome on macOS
  draws ja with Hiragino Kaku Gothic ProN and zh-TW with PingFang TC (蘋方-繁), chosen by the page's
  `lang`. Windows (Yu Gothic, Microsoft JhengHei) and Android (Noto Sans CJK) are **assumed** to do
  the same; Linux without CJK fonts would show tofu (**assumed**), which the check calls out as
  LastResort on macOS (**assumed**, not reproduced: no page shows a character without a font).
- **LCP and CLS do not move.** Every page's LCP is 72 to 136 ms, CLS at most 0.087 (`/he`, before
  and after), except `/ja/formats`: first paint at about 2.3 s with Noto Sans JP (2,296 to 2,432 ms,
  4 runs) and the same with the system font (2,316 to 2,616 ms, 7 runs), so not the fonts. Its LCP
  element is the long intro paragraph; `word-break: normal` instead of `auto-phrase` did not change
  it (2,388 ms). Open, outside this plan: hard-localisation or the formats plan should find it.

## Decisions (2026-09-26, delegated)

1. **Font byte budget: 300 KB per site page, first visit, every language** (`fontBudget` in
   `checks.js`, enforced by `fontChecks` per locale on `/` and `/formats`). The largest page after
   the change is `/ar/formats` at 227.2 KB, so 300 KB leaves about a third of headroom for content;
   the plan's earlier proposal (600 KB for CJK only) would have failed `/ja/formats` (620 KB) and
   both zh-TW pages (949 KB, 1,176 KB) anyway, and a budget only for CJK leaves every other script
   unguarded. Lowering it to 200 KB fails `/ar/formats` and both am pages (checked). Raise it only
   with new numbers here.
2. **Han (ja, zh-TW) moves to the system's fonts (survey approach A for Han only; B stays for every
   other script).** Their web fonts cost 351 KB to 1,176 KB per page, over the budget by up to four
   times, for glyphs every desktop and phone system already has; the system fonts keep each
   language's glyph shapes (measured above) at 0 bytes, and move neither LCP nor CLS. `fontChecks`
   now lets a system font draw a Han page (`systemFontScripts`), never tofu, and the Han check
   compares the fonts that actually draw each language's heading (it compared the CSS names before),
   so ja and zh-TW drawn by the same font still fails. Any other script, Korean and Greek included,
   still needs its web font, so a new language still fails with its script named. Cost: the Han
   look varies by platform, and the packages `@fontsource-variable/noto-sans-jp` and `-tc` are
   removed (496 font files in the build down to 25). Revisit if a Linux audience matters.
3. **Persian: Vazirmatn** (`@fontsource-variable/vazirmatn` 5.3.0, pinned exactly). Fontsource has no
   Persian-specific Noto (`@fontsource-variable/noto-sans-persian` and `@fontsource/noto-sans-persian`
   do not exist on npm; Noto covers Persian inside Noto Sans Arabic). Vazirmatn is designed for
   Persian (SIL OFL, on Google Fonts and fontsource), its Arabic-script slice is 45 KB against Noto
   Sans Arabic's 162 KB, and `/fa` falls from 191 KB to 74 KB, `/fa/formats` from 259 KB to 108 KB.
   Arabic keeps Noto Sans Arabic. A native reader's review is still welcome; swapping back is one
   line in fonts.css.

## Steps

1. **Measure (spike, about 1 hour).** Done 2026-09-26 on a local build, see "Step 1: measured".
   On a preview: per locale, fonts used
   (`getPlatformFontsForNode`), bytes, LCP and CLS for `/xx/formats`; confirm findings 3, 8 and
   the `LastResort` tofu signal. Gate: numbers recorded here.
2. **Fix the stacks.** Script font before Arial's fallback for non-Latin languages (or the
   fallback face limited to Geist's ranges, whichever fontaine allows), each with its fontaine
   fallback face. Gate: level 1, `project:test:cwv` on one page per script, screenshots.
3. **`fontChecks`** as above, run by both apps. Gate: fails on a scratch Greek locale with the
   script named, passes on all 13.
4. **Fonts rows on the formats page.** Gate: formats check asserts the server rows; no-JS check.
5. **Owner decisions:** Persian face; CJK byte budget; A vs B if step 1 shows CJK too heavy.
   Done 2026-09-26, see "Decisions".

## Done so far

Review fixes, 2026-09-25: the check counts only web fonts (`isCustomFont`), fails when none of its
selectors is on the page, and Han no longer lists Korean. The script fonts' fontaine fallback faces were
dropped (their sizes came from fontaine's Latin defaults, unmeasured for these scripts); each stack is
Geist, the script's Noto, Geist's fallback. Not yet run in the nine other languages, nor cwv per script:
the next full run (tier 4) covers the first.
 (2026-09-25)

- **Stacks fixed** (`fonts.css`): `'Geist Variable', '<script font> Variable', '<script font>
  Variable fallback', 'Geist Variable fallback', sans-serif`. Chosen over limiting Geist's fallback
  to Geist's ranges because fontaine 1.0 copies only weight, style and stretch onto fallback faces
  (read in `fontaine/dist`), so it cannot give them a `unicode-range`. Script fonts still load only
  on their language's pages; no preloads.
- **Known cost, measured 2026-09-26** (step 1: 30.9 KB on `/fa/formats`, 36.6 KB of symbols and
  math on `/ar/formats`, none elsewhere): every fontsource Noto package also carries Latin slices. While Geist is
  still loading, Chrome may reach the script font's Latin slice for Latin characters (Geist wins once
  loaded). **Assumed** a few KB per non-Latin page; measure in step 1.
- **`fontChecks`** (`checks.js`, called from `tests/gui.spec.ts` on the site pages): per language,
  `CSS.getPlatformFontsForNode` on the heading and intro; every drawing font must be one the
  language's stack names (not a fallback face, not a system font), each named script font must draw
  something, and Japanese and Traditional Chinese must name different fonts. The failure names the
  script (`maximize().script`). The byte budget and the Greek scratch-locale proof are not built.
