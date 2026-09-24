# Changelog

All notable changes to the shared UI package `@joeblew999/remy-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
package follows [Semantic Versioning](https://semver.org/).

## [0.3.0] - 2026-09-24

### Added
- `@joeblew999/remy-ui/checks`: shared Playwright checks (`publicPageChecks`, `entryChecks`,
  `demoChecks`, `formatsChecks`, `lighthouseChecks`, plus `collectErrors`, `endonym`,
  `direction`, `localizedPath`) so every app built on the package runs the same
  Google-facing checks; `@playwright/test` is an optional peer.
- `@joeblew999/remy-ui/samples`: the fixed sample values the formats and demo pages render
  and the checks expect.

## [0.2.0] - 2026-09-24

### Added
- Paraglide strategies `url`, `cookie`, `preferredLanguage`, `baseLocale` with URL patterns
  that keep every locale prefixed; `@joeblew999/remy-ui/locale` re-exports the runtime's
  `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName`
  and text `direction`.
- `@joeblew999/remy-ui/language`: `LanguageSwitcher` and `LanguageHint` on Paraglide's
  localized hrefs and `setLocale`, with their styles in `styles.css`.
- `@joeblew999/remy-ui/react-router`: `languageMiddleware` (Paraglide's middleware as root
  middleware), `suggestedLocale`, `redirectToLocalized` and `pageMeta`; `react-router`
  is an optional peer.
- `@joeblew999/remy-ui/seo`: `alternates` built from Paraglide's URL patterns.
- `@joeblew999/remy-ui/client`: `useSuggestedLocale` and `DeviceTime` for prerendered apps.
- `@joeblew999/remy-ui/cloudflare`: `placeFromCloudflare`.
- `@joeblew999/remy-ui/runtime`: the generated runtime as plain JavaScript for build configs.

### Changed
- The compiler options live in `packages/ui/paraglide.mjs`, shared by the Vite plugin and
  `mise run ui:generate`. The remembered-choice cookie is Paraglide's `PARAGLIDE_LOCALE`.

## [0.1.0] - 2026-09-24

### Added
- `@joeblew999/remy-ui/button`: the shadcn `base-nova` / Base UI button with Remy's variants.
- `@joeblew999/remy-ui/styles.css`: Remy's stone/orange theme tokens for light and dark mode.
- `@joeblew999/remy-ui/messages`: compiled Paraglide catalogs for English, Spanish and
  Arabic, including `number`, `datetime`, `relativetime` and `plural` formatters. The
  Arabic catalog is agent-authored and not yet reviewed.
- `@joeblew999/remy-ui/locale`: the locale list, `isLocale`, `baseLocale`, reading
  `direction` and endonym `localeName` from Intl.
- `@joeblew999/remy-ui/locale-info`: a locale's calendars, numbering system, hour cycle
  and week conventions, plus `weekdayName`.

[0.3.0]: https://github.com/joeblew999/remy-auth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/joeblew999/remy-auth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joeblew999/remy-auth/releases/tag/v0.1.0
