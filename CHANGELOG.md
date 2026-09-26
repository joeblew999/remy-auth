# Changelog

All notable changes to the shared UI package `@joeblew999/remy-ui` are documented here.
The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the
package follows [Semantic Versioning](https://semver.org/).

## [Unreleased]

### Added
- `shell`: `SourceLink`, a context for the site header's "GitHub" link. **An app sets its own
  repository** (`<SourceLink value="https://github.com/you/app">`); without it the header shows no source
  link instead of remy-auth's.
- Translation tasks in two pipelines (`tasks/i18n/`): `i18n:messages:check` and `i18n:docs:check`
  (offline, read-only; git, jq, `@lingual/i18n-check` 0.9.5, a plural-category check), `i18n:check` both
  (a warning; strict with `I18N_STRICT=1`), and `i18n:messages:translate`, `i18n:docs:translate`,
  `i18n:translate`: Claude Code 2.1.282 pinned in the task, with no tools, on main under a lock shared by
  every worktree, committing what it translated. Replaces `i18n:status`, the old `i18n:translate` and the
  provenance lines. Plural messages use `=*` for their fallback variant.
- Mobile navigation (`.plans/mobile-navigation.md`): on phones (below `md`, 768 px) a bottom bar
  (`blocks/bottom-nav`, an owned block of stock shadcn parts: shadcn has none) with the core pages and
  More, which opens the sidebar as its sheet; on tablets and desktops the sidebar, now collapsing to
  icons (`collapsible="icon"`). One list feeds both: `app-nav.tsx` (`appNavItems`, `matchesNav`).
- App pages `ClockPage` (time now in chosen zones; the route keeps them), `SettingsPage` (language,
  appearance, the device's zone and languages) and `AccountPage` (an empty state until sign-in);
  `appPaths` gains `/app/clock`, `/app/account`, `/app/settings`, so an app on the package adds those
  three routes when it updates. New catalog keys are English only while translation is frozen.
- `checks`: `appNavChecks` (the phone bar, More, the desktop sidebar, the clock's zones), run by both
  `serverAppChecks` and `prerenderedAppChecks`.
- `checks`: `fontChecks` enforces a font byte budget: a first visit to each site page downloads at
  most `fontBudget` (300 KB, option `budget`) of fonts, in every language. Measured on a local
  production build: 28.7 KB (Latin) to 227.2 KB (`/ar/formats`) (`.plans/fonts.md`, step 1).
  New exports `fontBudget` and `systemFontScripts`.
- Shared tasks `i18n:status`, `i18n:check` and `i18n:translate` (`tasks/i18n/`): per locale, docs
  translations missing or stale against the English version recorded in their first line
  (`<!-- translated-from: <path> @ <blob sha> -->`), and catalog keys missing, extra or with other
  placeholders than the base locale. `project:check` runs `i18n:check` as a warning; `ui:release` runs
  it strict first. An app with nothing to translate gets "nothing to translate". Replaces remy-auth's
  heading-only `docs:translations`.

### Changed
- `fonts.css`: Japanese and Traditional Chinese draw with the system's font for their language
  (Chrome picks it by the page's `lang`: Hiragino Kaku Gothic ProN and PingFang TC on macOS). Their
  Noto web fonts cost 351 KB (`/ja`) to 1,176 KB (`/zh-TW/formats`) per first visit; now 0 bytes
  beyond Geist. The dependencies `@fontsource-variable/noto-sans-jp` and `-tc` are removed, and the
  build's font files drop from 496 to 25.
- `fonts.css`: Persian draws with Vazirmatn (`@fontsource-variable/vazirmatn` 5.3.0, a
  Persian-designed face; fontsource has no Persian Noto) instead of Noto Sans Arabic: `/fa` downloads
  74 KB of fonts instead of 191 KB, `/fa/formats` 108 KB instead of 259 KB. Arabic keeps Noto Sans Arabic.
- `checks`: `fontChecks` lets a system font draw a Han page, never tofu (LastResort), and its Han
  check compares the fonts that actually draw each language's heading instead of the names in the
  CSS, so Japanese and Traditional Chinese drawn by one font still fails. Every other script still
  needs its web font.
### Changed
- `checks`: `cspChecks({ enforce })`, default `true`: expects the nonce policy under
  `Content-Security-Policy` (and none under `Content-Security-Policy-Report-Only`), or the reverse
  with `enforce: false`; checks the not-found page's policy too; enforced, proves a script without
  the nonce is blocked and reported. `serverAppChecks({ cspEnforced })` passes the app's switch.
  An app still sending the policy report-only passes `cspEnforced: false`.

## [0.11.0] - 2026-09-25

### Added
- Moves that remove copying from consumers (`.plans/publisher-consumer-analysis.md`, D4, D8, D9, D12):
  `./tailwind.css` (`globals.css`, `fonts.css`, `text.css` and the package's own `@source`, so an app
  writes one import and its own `@source "../src"`); `./prerender` (`prerenderPages({ notFoundPath })`,
  a prerendered app's page list); `seo`'s `sitemapXml({ origin, paths, extra })`, `sitemapEntries`,
  `robotsTxt(origin)`, `sitemapType`, `robotsType`; `./app-checks` (`serverAppChecks`,
  `prerenderedAppChecks`: the shared check set in one call per kind of app, the app's own pages
  passed beside the shared ones). remy-auth uses them; its CSS, sitemap, robots.txt and registered
  checks are unchanged. The separate imports keep working.
- `showcase/status-card`: the live status card (`StatusCard`, `LiveStatus`, `statusRefreshMs`), moved
  from remy-auth so remy-auth-app shows it too. The app passes the query: its own client's
  `queryOptions` (server-rendered), or a `contractClient` on another app's origin with
  `serverRendered={false}` (asked by the browser, with its own note, message `live_status_note_browser`).
  An answer that breaks the contract, or none, shows as an error (`data-status="error"`), never as data.
- `./invalidate`: `invalidateEverything(router, queryClient)`, moved from remy-auth (it took the
  router only and read the QueryClient from its context). `@tanstack/react-query` is a new optional peer.
- `api/server`: `apiHandlers` takes `origins`, the registered apps' exact origins allowed to call
  the API from their pages (oRPC's CORSPlugin; none by default, a wildcard is refused).
- `api/checks`: `apiChecks({ origins })` checks CORS: each registered origin allowed on a simple call
  and a preflight, any other origin not.
- `showcase/status-card.checks`: `statusCardChecks({ origin, registered })` for a consumer that asks
  another app's contract across origins (no status in the prerendered HTML, the other Worker names
  the page's origin, nothing asked from an unregistered origin), and for every card on a contract
  endpoint a check that an answer breaking the contract is shown as an error.
- Parts (`.plans/parts.md`): `./parts` (`readParts`, `catalog`), `./parts/vite` (`remyParts()`: a Vite
  plugin generating `virtual:remy-parts` from the app's `src/parts.json`, and the route config that
  mounts each listed part's routes through TanStack's `virtualRouteConfig` and `physical()`),
  `./parts/checks` (`partChecks()`). First part: `time-zones` (the `/time-zones/$` route and its checks),
  so an app adds or removes it with one line. New dependency `@tanstack/virtual-file-routes`.
- Parts, second pass: three more parts, each one line in `src/parts.json`.
  `deferred-place` (Cloudflare's place streamed into the formats and location pages, its `getPlace`
  server function and checks; links a zone to `time-zones` only when that part is listed),
  `seo-routes` (`/robots.txt` and `/sitemap.xml`, listing the package's site pages, every listed part's
  and the app's own entries from its `src/parts/seo-routes.ts`) and `status-card` (the live status card
  on the app home, with the app's status query from its `src/parts/status-card.ts`).
  The mechanism gains entry modules (`virtual:remy-parts/<part>/<entry>`, `undefined` for an unlisted
  part), app options (`virtual:remy-parts/<part>/app`), site paths a part adds (`sitePaths`) and
  `partSitePaths()`. New exports `./parts/seo-routes/sitemap` and `./parts/status-card/query` (types
  for the app's options). One implementation each: the seo-routes part builds its routes with `seo`'s
  `sitemapXml` and `robotsTxt` (as a prerendered app writes its files), and the status-card part is
  `showcase/status-card`'s card with the app's query.
- `serverAppChecks({ parts })` is part-aware: what a listed part owns runs with `partChecks()` instead,
  never twice (with `seo-routes` no sitemap test in `publicPageChecks`; the device-place row expects
  Cloudflare's place only with `deferred-place`). `parts` defaults to the app's `src/parts.json`, or
  none without one; `prerenderedAppChecks` is unchanged. remy-auth's test file is one `serverAppChecks`
  call, one `partChecks` call and its own checks.
- `sitemapChecks({ paths, oneLanguage })` (`checks`): the sitemap test, split out of `publicPageChecks`,
  which runs it unless told `sitemap: false` (the seo-routes part's checks run it then). The 404 check it
  shared a test with is a test of its own, still in `publicPageChecks`.
- `./problem` (`Problem`, `NotFound`, `ErrorPage`, `problemPages`) and `./preferred` (`usePreferred`),
  moved from remy-auth so parts' routes can use them. Nothing changes for existing imports.
- `./smoke`: `smokeChecks({ sitePaths, appPaths, hydrate, locales })`, tier 1 of the test tiers (every page
  answers, site pages with a heading, chosen pages hydrate cleanly) for any app on the package.
- `shell`: the site frame (`SiteShell`, `Shell`, `SiteNavLinks`, `Intro`, `SkipLink`, `ZoneBadge`)
  in a module of its own, so a page that needs only the frame (remy-auth's docs and problem pages)
  no longer downloads the home and formats pages. `pages` re-exports all of it: nothing changes for
  existing imports.
- `publicPageChecks({ oneLanguage: { translations } })`: one-language pages that also have their own
  text in other languages (remy-auth's translated docs) are expected in the sitemap once per language,
  self-canonical, with those languages as alternates and x-default.
- `locale-data` (plain JavaScript, re-exported by `locale-info`): one module that derives, per locale,
  its region, script, currency, calendars, numbering systems and plural counts (`ownValues`), each
  control's choices over all of Paraglide's locales (`allChoices`, `choicesFor`: the page's language's
  own first) and the formats page's `searchDefaults` (from the base locale). The region's currency
  comes from `country-to-currency` (new dependency; the runtime has no currency-for-region API).
- A numbering-system control on the formats page (`?numbering=`), in the Numbers section.
- `LocaleInfo` has `region`, `currency` and `counts`; `Group` passes other props (data attributes) to its card.
- `fontChecks({ paths })` (`checks`): per language, the fonts that actually draw the heading and
  intro (Chrome DevTools Protocol `CSS.getPlatformFontsForNode`) are the ones `fonts.css` names
  for it; a system or fallback font drawing the text fails naming the page's script and the font
  to add, a named script font that draws nothing fails, and Japanese and Traditional Chinese must
  name different fonts.

### Fixed
- `fonts.css`: Arabic, Persian and Hebrew pages are drawn with Noto Sans Arabic and Hebrew on
  macOS and Windows. Each language's script font now comes before fontaine's Geist fallback (local
  Arial, which carries Arabic and Hebrew and so drew them itself), followed by the script font's
  own metric-matched fallback face; Geist's fallback stays last. No new preloads.

### Changed
- Formats page: every section opens with what it is for the page's language (`data-own-area`):
  Money shows the amount in the language's own currency (was euros), Words lists the language's
  plural forms. Every control offers the union over all locales, the page's own values first, in
  the secondary look and described by a "This language" badge. `currencies`, `countChoices` and the
  showcase calendar list are gone; the currency default is the base locale's (USD, was EUR) and the
  count default its first count above one in the general form (2, was 3).
- `formatsChecks` and `searchParamsChecks` iterate the derived values, so a new locale needs no
  check edit; they also check the "for this language" card of every section and each control's
  order and marking.
- The formats rows (`Group`, `Row`) live in their own module and the showcase modules whose route
  options run in every page's first load (search params, time zones, device place) import them and
  the frame from there instead of from `pages`. `pages` still exports them.


### Added
- `SiteNavLinks` (`pages`): a context through which an app adds its own links to the site header;
  remy-auth adds "Docs". Without it the header is unchanged.
- `publicPageChecks({ oneLanguage })`: site pages written in one language only, listed once in the
  sitemap without alternates and checked on a narrow screen like the others.
- shadcn's `table` component (through `ui:components`), and messages for the docs and the answer
  page in every language.

### Changed
- `publicPageChecks`: the narrow-screen, fonts and mirrored-header check runs one test per
  language, and one-language pages once, in their own language.

## [0.10.5] - 2026-09-25

### Added
- Ten more languages: fa, he, th, ja, zh-TW, hi, am, pl, tr, de (13 in all), each with its Noto
  font from fontsource where Geist has no glyphs, applied by `:lang()`.
- `text.css`: hyphenation by the page's language, casing by `lang` (Turkish İ), phrase breaking for
  Japanese headings. `checks`: `textChecks({ paths })` (every page fits 320 px, per language).
- Formats: each language's own calendar and digits through one explicit format tag
  (`formatTag`), more calendars in the control, week rules from `Intl.Locale` `getWeekInfo`,
  word segmentation with `Intl.Segmenter`, native digits in counts through Paraglide's number
  function.
- `matching.js`: a Paraglide custom strategy that sends Chinese browsers to zh-TW.
- Quick test tier (`project:test:quick`): one language per writing system (`QUICK_LOCALES`,
  default en, ar, ja, th).

### Changed
- Per-language checks (app pages kept out of search, CSP violations while hydrating, text) run as
  one test per language, so the time per test does not grow with the language count.

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
  handler, which gets the original request so its Cloudflare `cf` properties reach server functions;
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
