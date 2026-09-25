# Fonts per writing system (quick plan)

Status: open, 2026-09-25. Built 2026-09-25: the stack fix (step 2) and `fontChecks` (step 3);
steps 1, 4 and 5 remain (see "Done so far" below). Owner's question: "as we add more languages
then fonts need to be downloaded? ... it's tempting to align the adding of a language with a font
download but I doubt it's that simple ... Tempting to also show the fonts aspect in the formats gui
control". Builds on [hard localisation](hard-localisation.md) item 10 and the fonts rule in
[fonts.css](../packages/ui/src/fonts.css). Checked 2026-09-25 against the installed packages
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

   A CJK page downloads only the slices holding its characters; how many that is for `/ja` and
   `/zh-TW/formats` is **assumed** (tens of slices, a few hundred KB) until measured.
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
`/ar/formats` (bytes, LCP, CLS, screenshots) before deciding, as [how we work](../docs/how-we-work.md#choose-tools-by-survey-not-by-first-find) asks.

## Steps

1. **Measure (spike, about 1 hour).** On a preview: per locale, fonts used
   (`getPlatformFontsForNode`), bytes, LCP and CLS for `/xx/formats`; confirm findings 3, 8 and
   the `LastResort` tofu signal. Gate: numbers recorded here.
2. **Fix the stacks.** Script font before Arial's fallback for non-Latin languages (or the
   fallback face limited to Geist's ranges, whichever fontaine allows), each with its fontaine
   fallback face. Gate: level 1, `project:test:cwv` on one page per script, screenshots.
3. **`fontChecks`** as above, run by both apps. Gate: fails on a scratch Greek locale with the
   script named, passes on all 13.
4. **Fonts rows on the formats page.** Gate: formats check asserts the server rows; no-JS check.
5. **Owner decisions:** Persian face; CJK byte budget; A vs B if step 1 shows CJK too heavy.

## Done so far (2026-09-25)

- **Stacks fixed** (`fonts.css`): `'Geist Variable', '<script font> Variable', '<script font>
  Variable fallback', 'Geist Variable fallback', sans-serif`. Chosen over limiting Geist's fallback
  to Geist's ranges because fontaine 1.0 copies only weight, style and stretch onto fallback faces
  (read in `fontaine/dist`), so it cannot give them a `unicode-range`. Script fonts still load only
  on their language's pages; no preloads.
- **Known cost, open:** every fontsource Noto package also carries Latin slices. While Geist is
  still loading, Chrome may reach the script font's Latin slice for Latin characters (Geist wins once
  loaded). **Assumed** a few KB per non-Latin page; measure in step 1.
- **`fontChecks`** (`checks.js`, called from `tests/gui.spec.ts` on the site pages): per language,
  `CSS.getPlatformFontsForNode` on the heading and intro; every drawing font must be one the
  language's stack names (not a fallback face, not a system font), each named script font must draw
  something, and Japanese and Traditional Chinese must name different fonts. The failure names the
  script (`maximize().script`). The byte budget and the Greek scratch-locale proof are not built.
