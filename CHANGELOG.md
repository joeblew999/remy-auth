# Changelog

All notable changes to the shared UI package `@joeblew999/remy-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
package follows [Semantic Versioning](https://semver.org/).

## [0.9.0-rc.0] - 2026-09-25

Pre-release for the move to TanStack Start and Router ([plan](.plans/tanstack.md)); not published.

### Added
- `@joeblew999/remy-ui/tanstack`: `localizedWorker(service, start)`, the Worker entry for a
  server-rendered Start app (`withObservability` around Paraglide's middleware around Start's
  handler, which gets the original request so `request.cf` reaches server functions;
  un-localized entry URLs answer 302 with `Vary`; HTML is `no-store`); `entryRedirect`;
  `localeRewrite`, the router `rewrite` (Paraglide's `deLocalizeUrl`/`localizeUrl`);
  `pageHead({ path, title, description })` for a route's `head()`: title, description,
  self-canonical and reciprocal hreflang; `suggestedLocale(request)` and
  `suggestedLocaleInBrowser(page)` for the language hint.
- `DemoPage` takes optional `onReserve` (called once the form's own validation passes; its
  field errors or confirmation message are shown) and `onDirtyChange` (unsaved input), and
  exports the `Reservation` and `ReservationResult` types. Without them it behaves as before.
- Export patterns `./showcase/*` (`src/showcase/*.tsx`) and `./showcase/*.checks`
  (`src/showcase/*.checks.js`) for the TanStack showcase's components and checks.
- `worker`: the inner handler receives the generated request ID as `X-Request-ID` (a client's
  own value is replaced); new exports `logContext`, `writeLog`, `outcome`, `level` and
  `requestIdHeader`, so the log contract has one definition.
- Showcase modules: `showcase/search-params` (`validateSearch`, `searchDefaults`,
  `calendarsFor`, `FormatsControls`), `showcase/navigation-blocking` (`useLeaveGuard`) and
  `showcase/time-zone` (`TimeZonePage`, `canonicalTimeZone`, `timeZoneName`, `timeZonePath`).
- Showcase checks: `search-params`, `preload`, `navigation-blocking`, `server-functions`,
  `deferred-place`, `status-card`, `problem` (localized 404 for an unknown sub-resource, error
  page without leaks and retry, read-only server routes with caching and 405),
  `code-splitting` and `build-boundaries` (`serverOnlyMarkers`, `devtoolsMarkers`).
- Catalog keys for the search-param controls, the leave-page warning, the live status card, the
  retry button and the time zone page.

### Changed
- `pages`: in-app links are TanStack `Link`s to de-localized paths with `preload="intent"`;
  the router's rewrite adds the locale. Language changes stay plain anchors (full navigations).
- Peer dependency `react-router` replaced by `@tanstack/react-router` (optional).

### Removed
- `@joeblew999/remy-ui/react-router` (`languageMiddleware`, `redirectToLocalized`, `pageMeta`,
  `requireLocale`, `suggestedLocale`); routes no longer carry a `:locale` segment.

## [0.8.0] - 2026-09-24

### Added
- `@joeblew999/remy-ui/worker`: `withObservability(service, handler)` wraps any Worker's
  fetch: `X-Request-ID` on every response, one structured log line per request following the
  shared contract (`schemaVersion`, `service`, `environment`, `release` from the version
  metadata binding, `event`, `level`, `requestId`, route template, `method`, `status`,
  `outcome`, `reasonCode` on failures, never URLs or headers), and `/healthz` for liveness.
- `observabilityChecks({ service, paths })` in the shared checks.

## [0.7.0] - 2026-09-24

### Added
- `@joeblew999/remy-ui/pages`: `Shell`, `HomePage`, `DemoPage`, `FormatsPage` (with slots
  for an app's extra rows and sections), `Group` and `Row`: the pages the shared checks
  test, so both apps render the same markup instead of keeping copies.
- `@joeblew999/remy-ui/paths`: `publicPaths` as plain JavaScript for route configs and specs.
- `requireLocale` in `@joeblew999/remy-ui/react-router`.

## [0.6.0] - 2026-09-24

### Changed
- `playwrightConfig()` splits checks into two levels: `ours` (the app's own checks, fast)
  and `google` plus `google-cwv` (Lighthouse audits and Core Web Vitals, slow). The shared
  `project:test` runs level 1; `project:test:google` runs level 2; `project:test:remote`
  runs both against a deployment.

## [0.5.0] - 2026-09-24

### Added
- `performanceChecks` in `@joeblew999/remy-ui/checks`: Core Web Vitals through Google's
  `lighthouse` package (optional peer) over Playwright's Chrome, gated on Google's "good"
  thresholds (LCP 2.5 s, CLS 0.1, TBT 200 ms) and a Performance score of at least 0.9,
  with the HTML report attached. The Chrome DevTools CLI excludes that category by design.
  `playwrightConfig()` runs `tests/performance.spec.ts` alone after every other file, so
  parallel browsers cannot inflate the timings, and Lighthouse measures a page the check
  has already warmed, since a fresh browser's cold font scan is not a page cost.

### Changed
- Every component in `src/components` is generated by the pinned shadcn CLI from the
  official `base-nova` registry (button, card, input, label, badge, alert, separator,
  field); `mise run ui:components` regenerates them and the gate fails on any drift.
  Exported as `@joeblew999/remy-ui/components/*`.
- `LanguageSwitcher` and `LanguageHint` are built from those components (`Alert`,
  `Button`) and Tailwind utilities; the package ships no component CSS of its own.

## [0.4.0] - 2026-09-24

### Added
- `@joeblew999/remy-ui/playwright`: `playwrightConfig()`, the shared Playwright configuration
  (local target on Cloudflare's local host at `PREVIEW_PORT`, remote target from
  `TEST_BASE_URL`, per-target HTML reports), so a project's config is one call.

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

[0.8.0]: https://github.com/joeblew999/remy-auth/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/joeblew999/remy-auth/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/joeblew999/remy-auth/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/joeblew999/remy-auth/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/joeblew999/remy-auth/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/joeblew999/remy-auth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/joeblew999/remy-auth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joeblew999/remy-auth/releases/tag/v0.1.0
