# Changelog

All notable changes to the shared UI package `@joeblew999/remy-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
package follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

## [0.10.4] - 2026-09-25

### Added
- Site header on shadcn's NavigationMenu (plain links, complete without JavaScript), a footer list of
  every language as real links, and a header language dropdown over the same links whose trigger
  falls back to that list without JavaScript.
- `theme`: shadcn's TanStack Start ThemeProvider and ModeToggle (light, dark, system), on site and
  app pages. Without JavaScript site pages show the default theme.
- Breadcrumb on the time zone pages (shadcn Breadcrumb, server-rendered links).

- `tanstack`: `pageHead` adds schema.org `WebSite` structured data (name, site root) to the site
  home page through TanStack's `script:ld+json` head entry.
- `worker`: every response sends `Content-Security-Policy: frame-ancestors 'none'`,
  `Cross-Origin-Opener-Policy: same-origin-allow-popups` and `Strict-Transport-Security: max-age=300`.
- `checks`: `cspChecks({ paths, reportPath })` for a nonce-based Content Security Policy (nonce on
  every script, no violations while hydrating, report endpoint); `publicPageChecks` and
  `zoneChecks` cover the structured data; `observabilityChecks` covers the new headers.

- `./api/server`, `./api/client`, `./api/coverage`, `./api/checks`: contract-first APIs on oRPC
  1.15.4 (`.plans/openapi-contracts.md`). `apiHandlers` mounts an oRPC router in one TanStack Start
  server route with the generated OpenAPI 3.1 document (`/api/openapi.json`) and its reference
  page (`/api/doc`); `contractClient` calls any contract with every response validated;
  `isomorphicClient` gives an app one client for its own contract on both sides; `coverageProblems`
  and `apiChecks` fail on a procedure without a route, a policy or documented errors;
  `reservationApiChecks` covers the demo reservation over HTTP. New dependencies: `@orpc/client`,
  `@orpc/contract`, `@orpc/openapi`, `@orpc/openapi-client`, `@orpc/server`, `@orpc/zod`, all
  1.15.4; `@tanstack/react-start` is a new optional peer.
- `./reservation`: `reservationFieldErrors` and `reservationConfirmation`, the wire shapes a
  contract declares for a rejected and an accepted reservation.
- Paraglide's `routeStrategies` keep `/api/*` out of URL localisation: no redirect, and the
  language comes from Accept-Language, else the base locale.

### Changed
- One zone badge style (secondary) on site and app pages; the app pages no longer repeat it as a
  label; site pages have no back links (they navigate through the header).
- `./reservation` sets Zod's `jitless` option, so Zod never probes for eval under a strict CSP.
- `zoneChecks` accepts a `nonce` attribute on the app pages' robots meta.
- `showcase/status-card.checks`: `statusCardChecks` takes `endpoint`, the path the card asks for
  the status; without it, any server function as before.

## [0.10.3] - 2026-09-25

### Added
- `./reservation`: the demo reservation's rules as one Zod 4 schema (`reservationSchema(locale)`,
  localized messages) for the browser and the server, the server function's input shape
  (`reservationInput`) and `reservationErrors` for a server's field errors.

### Changed
- `showcase/search-params`: the formats search params are validated by a Zod 4 schema,
  `formatsSearchSchema`, which TanStack Router takes directly as `validateSearch` (Standard
  Schema, no adapter). It replaces the hand-written `validateSearch` function and its parsing
  helpers; `FormatsSearch` is the schema's output type. Written with Zod Mini to keep the entry
  chunk small. New dependency: `zod` 4.6.5.
- `DemoPage`'s form runs on TanStack Form (`@tanstack/react-form` 1.33.5) with shadcn's Field
  pattern: the shared schema validates on submit, a server's field errors show as the form's own,
  and `onDirtyChange` follows the form's `isDirty`. Its own validation code and input tracking are
  gone; `Reservation` and `ReservationResult` now come from `./reservation` (still re-exported).

## [0.10.2] - 2026-09-25

### Changed
- Formats in five sections (this language, dates and times, numbers, money, words) with a list of
  links to them; each search-param control sits in the section it changes. `FormatsExtras` slots are
  now rows in groups (`language`, `systems`, `dates`, `currency`) and cards per section (`time`,
  `numbers`, `money`, `words`); `FormatsControls` and `PrerenderedFormatsControls` become
  `choiceCards` and `prerenderedChoiceCards` (one `ChoiceCard` per param, with `to`).
- Full width in both frames, as shadcn's sidebar-16 block has it; formats cards two per row on
  medium screens and three on wide ones.

## [0.10.1] - 2026-09-25

### Added
- Formats as a site page and an app page: `FormatsContent` (the page's content once),
  `FormatsPage` (site frame) and `AppFormatsPage` (app frame); `/app/formats` in `appPaths` and the
  app sidebar; `FormatsControls` takes the page it belongs to (`to`).
- `LanguageMenu`: the app pages' language picker, shadcn's DropdownMenu with a radio group; choosing
  calls Paraglide's `setLocale`. Site pages keep the plain links.
- `zoneChecks`: on a phone in landscape, the way back to the site stays in view.

### Changed
- The app sidebar's "Back to the site" moves into `SidebarFooter`, so it stays in view on short
  screens.
- `performanceChecks` judges the median of five runs (Lighthouse's `computeMedianRun`).
- `demoChecks` switches language through the app's menu.

## [0.10.0] - 2026-09-25

All in on shadcn, and site pages kept apart from app pages. Breaking for consumers.

### Changed
- shadcn's monorepo layout: the app's `components.json` routes `shadcn add` into this package; the
  stylesheet is `globals.css` (was `styles.css`), exactly what the shadcn CLI writes (default Nova
  style, neutral theme, Geist), checked by `mise run ui:verify` before every release.
- Components regenerated with shadcn's RTL mode; `direction` (DirectionProvider), `skeleton`,
  `empty`, `sidebar`, `sheet`, `tooltip`, `breadcrumb`, `collapsible`, `dropdown-menu`, `avatar` and
  the `use-mobile` hook added through the CLI.
- `fonts.css`: Geist from shadcn, Noto Sans Arabic on Arabic pages per shadcn's RTL guide, generic
  code font; apps add fontaine's size-matched fallbacks in their Vite config.
- `paths`: `sitePaths` (for Google: no JavaScript needed, indexed, in the sitemap), `appPaths`
  (under `/app`: JavaScript, noindex) and `allPaths`, replacing `publicPaths`; `pageHead` adds
  noindex to app pages.
- `pages`: `SiteShell` (static shadcn parts), `ZoneBadge`, `SkipLink`, `Intro`; the demo moves to
  `app-pages` with `AppShell` (shadcn's sidebar-16 block, owned in `blocks/sidebar-16`),
  `AppHomePage` and `LocationPage`.
- `publicPageChecks` enforces that every named font is loaded; new `zoneChecks`; checks find page
  links inside `#main`; `codeSplittingChecks` takes a start page per zone.

## [0.9.3] - 2026-09-25

### Added
- `showcase/device-place`: `DevicePlace`, the device's own location from the Geolocation API,
  asked only when the visitor presses its button, explained before asking, never sent anywhere;
  with Cloudflare's location it also shows the distance between the two. `devicePlaceChecks`.
- `cloudflare`: `Place` carries Cloudflare's `latitude` and `longitude` when valid.
- `worker`: every response sends `Permissions-Policy: geolocation=(self), camera=(), microphone=()`,
  asserted by `observabilityChecks`.

## [0.9.2] - 2026-09-25

### Added
- `showcase/search-params`: `PrerenderedFormatsControls`, the formats controls for a prerendered
  page (static defaults in the HTML, the address's values once hydrated, through TanStack's
  `ClientOnly`), and `FormatsControls`' `interactive` option behind it.
- `checkedLocales` in `@joeblew999/remy-ui/checks`: every locale, or the subset in `CHECK_LOCALES`;
  every per-language check iterates it, so the shared `project:test:quick` tier can run the checks
  on a few representative languages.

### Changed
- `statusCardChecks` jumps the refresh interval with Playwright's clock instead of waiting it out
  (about 10 s to under 1 s).

## [0.9.1] - 2026-09-25

### Fixed
- `DemoPage` notices input typed before hydration (a prerendered page fires no `onInput` for it),
  so the leave warning still guards it.
- `demoChecks`, `navigationBlockingChecks` and `codeSplittingChecks` act only once React has
  hydrated the element, instead of racing hydration on prerendered pages.

### Added
- `hydrated(locator)` in `@joeblew999/remy-ui/checks`: resolves once React has hydrated an element.

## [0.9.0] - 2026-09-25

The move to TanStack Start, Router and Query, with the TanStack showcase ([plan](.plans/done/tanstack.md)).
Replaces React Router: consumers move their routes to TanStack file routes (see remy-auth and
remy-auth-app).

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
- `HomePage` takes `children`, shown inside the page under its links (the live status card).
- `LanguageHint` puts its two actions under the text instead of shadcn's absolutely placed
  `AlertAction`, which overlapped the text at phone width.
- `DemoPage` shows the localized "Please try again." when `onReserve` rejects, instead of an
  unhandled rejection.
- `performanceChecks` no longer warms a page before Lighthouse measures it. The warm-up hid a
  first-layout stall of seconds that every visitor paid in a fresh Chrome renderer on macOS; the
  cause was font-family names that never load (`Inter`, `ui-monospace`, `SFMono-Regular`, ...),
  fixed by the new `fonts.css` export (generic families only: `system-ui, sans-serif` and
  `monospace`), which each app imports after `styles.css`.
- `publicPageChecks` fails when any element on any page uses a non-generic font family or the
  page declares a web font.

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

[Unreleased]: https://github.com/joeblew999/remy-auth/compare/v0.10.4...HEAD
[0.10.4]: https://github.com/joeblew999/remy-auth/compare/v0.10.3...v0.10.4
[0.10.3]: https://github.com/joeblew999/remy-auth/compare/v0.10.2...v0.10.3
[0.10.2]: https://github.com/joeblew999/remy-auth/compare/v0.10.1...v0.10.2
[0.10.1]: https://github.com/joeblew999/remy-auth/compare/v0.10.0...v0.10.1
[0.10.0]: https://github.com/joeblew999/remy-auth/compare/v0.9.3...v0.10.0
[0.9.3]: https://github.com/joeblew999/remy-auth/compare/v0.9.2...v0.9.3
[0.9.2]: https://github.com/joeblew999/remy-auth/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/joeblew999/remy-auth/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/joeblew999/remy-auth/compare/v0.8.0...v0.9.0
[0.8.0]: https://github.com/joeblew999/remy-auth/compare/v0.7.0...v0.8.0
[0.7.0]: https://github.com/joeblew999/remy-auth/compare/v0.6.0...v0.7.0
[0.6.0]: https://github.com/joeblew999/remy-auth/compare/v0.5.0...v0.6.0
[0.5.0]: https://github.com/joeblew999/remy-auth/compare/v0.4.0...v0.5.0
[0.4.0]: https://github.com/joeblew999/remy-auth/compare/v0.3.0...v0.4.0
[0.3.0]: https://github.com/joeblew999/remy-auth/compare/v0.2.0...v0.3.0
[0.2.0]: https://github.com/joeblew999/remy-auth/compare/v0.1.0...v0.2.0
[0.1.0]: https://github.com/joeblew999/remy-auth/releases/tag/v0.1.0
