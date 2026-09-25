# Language tests: when each language is checked

Status: built 2026-09-25 (cf:deploy and cf:preview run QUICK_LOCALES; project:verify and ui:release every language). Decided 2026-09-25 (owner: "We really don't need lang tests all the time"); to build.
With 13 languages level 1 is 237 checks in about 1.6 minutes, and it grows with each language.

- **Everyday gate (`project:verify`, `cf:deploy`, `cf:preview`):** one language per writing
  system, the quick tier's `QUICK_LOCALES` (en, ar, ja, th). Latin, right-to-left, CJK and a
  script without spaces cover the code paths that differ by language.
- **Every language:** `ui:release` (level 1 and the preview) and a new `project:test:languages`,
  run by hand and by the agent after any catalog, locale or font change. Nothing is published
  without every language passing, so no check is loosened; it only runs less often.
- **Build:** the tasks set `CHECK_LOCALES` (already read by `checkedLocales`); the release task
  sets it to every locale. Document the tiers in `docs/tooling.md`. Measure both times.
- **Later:** CI runs every language nightly and on changes to `messages/`, `project.inlang` or
  `fonts.css`.
