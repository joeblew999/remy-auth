# Minimal GUI proof

[Back to the README](../README.md)

```sh
mise run project:dev       # http://127.0.0.1:5173/en
mise run project:preview   # Production build on local Workers, port 4173
mise run project:verify    # Tooling, types, build, browser tests and package check
```

Google Chrome must be installed. Everything runs locally in the Workers runtime;
no Cloudflare account, database or production credentials are needed. Browser
tests own port 4173 and refuse to reuse an unrelated process. Stop a manual preview
before verification; the development server on 5173 can remain running.

## One scaffold for local and Cloudflare

`wrangler.jsonc` is the source of truth for the Worker entry, compatibility flags,
bindings and observability. Vite generates `dist/server/wrangler.json` and
`.wrangler/deploy/config.json`; do not hand-edit or commit either generated file.
Both local preview and Wrangler deployment consume the generated production build.
Development uses the same Worker source and Cloudflare runtime with hot reload.

| Task | Target |
| --- | --- |
| `project:dev` | Local Workers, hot reload, port 5173 |
| `project:build` | Build and Wrangler deployment dry run; no upload |
| `project:preview` | Build, then serve the production artifact on Cloudflare's local host at `PREVIEW_PORT` (4173) |
| `project:test` | Level 1: build, then run our own checks on the same local host (fast) |
| `project:test:quick` | Level 1 in a few languages only, for the edit loop; not a gate |
| `project:test:google` | Level 2: Lighthouse audits and Core Web Vitals locally (slow; CI runs it on every push) |
| `cf:deploy` | Build, then upload to the authenticated Cloudflare account |
| `cf:preview` | Upload this branch as a preview beside production, then run level 1 against it |
| `project:test:remote` | Same tests against `TEST_BASE_URL`; no local server or deployment |
| `project:report` / `project:report:remote` | Open the last local or remote run's HTML report, including Lighthouse reports |

After deliberately deploying to the intended account, run:

```sh
TEST_BASE_URL=https://your-worker.your-subdomain.workers.dev mise run project:test:remote
```

The URL must be an origin, without a path or query. Current tests read public
routes and manipulate only the browser counter. Authentication and storage tests
will need isolated fixtures when those features exist. The remote test task can
also target an already-running local preview to check the external-server path.

The pipeline tasks are shared defaults from `tasks/project.toml`, driven by this
project's `[env]` inputs (`PREVIEW_PORT`, `DEPLOY_ORIGIN`); this repository overrides only
`project:typecheck` and `project:verify` because it owns the package. The Playwright
configuration is the package's `playwrightConfig()`.

There is currently one Worker configuration and no named staging environment.
If environments are added, select them using `CLOUDFLARE_ENV` at build time,
as required by the [Cloudflare Vite integration](https://developers.cloudflare.com/workers/vite-plugin/reference/cloudflare-environments/).
Keep the implementation shared; vary only resource identifiers, secrets and other
environment values. Bindings that Wrangler does not inherit must be declared for
each named environment. Do not copy the application or use remote bindings for
ordinary local development. Local secrets stay in ignored `.dev.vars`; deployed
secrets are managed through Cloudflare. Local data is not uploaded by deployment.

## Two kinds of page

[`packages/ui/src/paths.js`](../packages/ui/src/paths.js) is the one list of pages and says what
each kind promises; the two are never mixed.

- **Site pages** (`sitePaths`: the home and formats) are for Google: complete in the server's HTML
  without JavaScript, indexed, in the sitemap with `hreflang` alternates, and judged by level 2.
  Their frame is `SiteShell` in [`pages.tsx`](../packages/ui/src/pages.tsx), built from static
  shadcn parts.
- **App pages** (`appPaths`, under `/app`) need JavaScript, carry `noindex` (added by `pageHead`)
  and stay out of the sitemap. Their frame is `AppShell` in
  [`app-pages.tsx`](../packages/ui/src/app-pages.tsx), shadcn's sidebar-16 block owned in
  [`blocks/sidebar-16`](../packages/ui/src/blocks/sidebar-16/README.md).

The language picker follows the kind: site pages use `LanguageSwitcher`, plain links that need no
JavaScript; app pages use `LanguageMenu`, shadcn's DropdownMenu calling Paraglide's `setLocale`
(both in [`language.tsx`](../packages/ui/src/language.tsx)).

## What is implemented

Every page exists in every locale (`/en`, `/es`, `/ar` prefixes); the table names them without it.

| Route | Kind | Behavior |
| --- | --- | --- |
| `/`, `/formats`, `/app`, ... (every path without a locale) | Entry | Redirect to the visitor's language: Paraglide's `cookie` (a remembered choice), then `preferredLanguage` (Accept-Language), else English, with `Vary`. These entry URLs are the `x-default` targets |
| `/en` | Site | Localized home with direction, metadata and alternate links |
| `/en/formats` | Site | The locale's conventions in five sections (this language, dates and times, numbers, money, words), each search-param control in the section it changes; the dates include the visitor's place from Cloudflare's request geolocation, streamed behind `Await` and never stored, and the device's own time zone. `?currency`, `?count` and `?calendar` are typed, validated search params (defaults left out of URLs, invalid values redirect to the canonical URL); loader data stays fresh for five minutes. The content is `FormatsContent`, shared with `/app/formats` |
| `/en/time-zones/Asia/Tokyo` (any IANA name) | Site | Sub-resource of the formats page: the zone's localized name, offset and the sample instant there. An unknown name is a localized 404 naming it (`notFound()`); another spelling of a known name answers 301. Not in the sitemap |
| `/en/app` | App | Live status card: TanStack Query over the contract's `GET /api/status` (the router itself during SSR, HTTP in the browser), server-rendered, polled every 10 s, with a refresh that invalidates every loader and query at once (`src/invalidate.ts`) |
| `/en/app/formats` | App | The formats page's content in the app frame |
| `/en/app/demo` | App | `ssr: false`. Counter and reservation form validated in the browser and again by the contract's `POST /api/reservations` (a TanStack Query mutation), which answers in the page's language; broken rules come back as its typed 400 and show as the form's own errors; leaving with unsaved input asks first (`useBlocker`) |
| `/en/app/location` | App | Cloudflare's location of the request beside the device's own, which the Geolocation API gives only after the visitor presses its button |
| `/api/status`, `/api/reservations` | API | Contract endpoints ([@joeblew999/remy-auth-contract](../packages/contract/README.md)) served by oRPC behind one Start server route (`src/routes/api.$.ts`, `src/api/`): input and output validated, typed errors, the language from Accept-Language (Paraglide's `routeStrategies`), no locale in the URL |
| `/api/openapi.json`, `/api/doc` | API | The OpenAPI 3.1 document generated from the router in-process, and its reference page (oRPC's Scalar page, script pinned) |
| `/robots.txt`, `/sitemap.xml` | Server routes | `Cache-Control: public, max-age=3600`; methods other than GET and HEAD answer 405 with `Allow`; the sitemap lists the site pages in every locale with `hreflang` alternates |
| Unknown route or locale | | HTTP 404 with the localized not-found page (an un-localized unknown path first redirects to the visitor's language, as TanStack's rewrite canonicalizes it) |
| A page's loader failing | | That route's localized error page (500 when server-rendered) with a retry that re-runs the loaders; every page route and the root set both problem pages (`src/problem.tsx`) |

Localized pages never redirect. When the visitor's preferred language differs from the page, a dismissible hint offers that version; choosing or dismissing is remembered in Paraglide's `PARAGLIDE_LOCALE` cookie, which only the entry URLs act on. Locale detection, the cookie, URL localisation and the redirect are Paraglide's own strategies and middleware (`packages/ui/paraglide.mjs` holds the one compiler configuration), wired as Paraglide's official TanStack Start integration: the middleware wraps the Worker entry, and the router's `rewrite` removes the locale before matching and adds it to every link, so routes carry no locale segment.

TanStack Start runs through Cloudflare's Vite plugin ([`vite.config.ts`](../vite.config.ts)). Every
route is server-rendered except the demo. In-app links preload their route's code and data on
intent; language changes on site pages are full navigations.

## shadcn, stock

Components and the theme are what the shadcn CLI writes, in shadcn's monorepo layout: this app's
[`components.json`](../components.json) routes `shadcn add` into the package
([`packages/ui/components.json`](../packages/ui/components.json)), and
`packages/ui/src/styles/globals.css` is written by the CLI too. Nobody edits either by hand; the
tasks in [`mise.toml`](../mise.toml) are the only way they change:

```sh
mise run ui:components     # Re-add every shadcn component (extend the list there to add one)
mise run ui:theme          # Rewrite globals.css with shadcn's default theme
mise run ui:verify         # Re-run both and fail on any difference (runs before every release)
mise run ui:pack           # Produce the package tarball locally
```

Blocks are owned copies, as shadcn intends; sidebar-16's README says what was changed.

Fonts live in [`packages/ui/src/fonts.css`](../packages/ui/src/fonts.css), imported after
`globals.css` (see [`src/styles.css`](../src/styles.css)); the file explains its rules. fontaine in
[`vite.config.ts`](../vite.config.ts) generates the size-matched fallback faces it names.
`publicPageChecks` fails on any named family that is not loaded.

## Structure and reuse

- `src/routes/`: TanStack file routes (loaders, `head`, per-route rendering) that render the package's pages, plus this app's extra formats rows (`src/formats-extras.tsx`), and `robots.txt`, `sitemap.xml` and `csp-report` as server routes; `src/routeTree.gen.ts` is generated by the router plugin during dev and build and committed.
- `src/server.ts`: Worker entry through the package's `localizedWorker` (request IDs, structured status logs, `/healthz`, Paraglide's middleware, entry redirects). Start receives the original request, so server functions read Cloudflare's geolocation from `request.cf` in a server-only module under Start's import protection (`src/place.server.ts`). The wrapper passes its request ID inward as `X-Request-ID`; Start's request middleware exposes it as `context.requestId`, and a function middleware logs one `server_fn` line per call (`src/middleware.ts`). A second request middleware there makes the per-request CSP nonce that `src/router.tsx` hands to TanStack Router, and the server route `src/routes/csp-report.ts` logs the policy's reports ([security headers](../.plans/gui-portal.md)). The service name has one home, `src/service.ts`.
- `src/api/`: the contract's implementation (`router.ts`, no Workers imports so the checks load it in Node), each call's context (`context.server.ts`) and the isomorphic client with its TanStack Query utilities (`client.ts`). The contract is `packages/contract/`; the shared mechanism is the package's `api/*` exports; [the contracts plan](../.plans/openapi-contracts.md) owns the design.
- `src/router.tsx`: a new router and TanStack Query client per request, with Query's SSR integration. TanStack Devtools (Router and Query panels) mounts in `src/routes/__root.tsx` and its `devtools()` Vite plugin strips it from production builds; the build-boundary check proves no devtools or server-only code reaches the browser.
- `packages/ui/`: everything both apps share; its [README](../packages/ui/README.md) lists the exports.
- `tests/`: the package's shared checks (`@joeblew999/remy-ui/checks`, `showcase/*.checks`) plus the checks only this repository owns (catalogs, concurrent server renders, hydration, its extra formats rows); `lighthouse.spec.ts` and `performance.spec.ts` are level 2.

Locale is passed explicitly into compiled message functions; concurrent requests share no
mutable locale state. The catalogs are the `locales` in
[settings.json](../packages/ui/project.inlang/settings.json); every one except English and Spanish
was written by an agent and is unreviewed. Direction, endonyms, dates, numbers, currency and plurals
follow the decisions recorded in
[the GUI plan](../.plans/done/gui.md#dates-numbers-currency-and-direction).

The package's real consumer is [remy-auth-app](https://github.com/joeblew999/remy-auth-app),
which installs the published package and runs its checks on prerendered pages, while this app
runs them on server-rendered ones.

## Evidence and limits

The automated checks cover catalog parity and plural-category coverage, every
locale's HTML with JavaScript disabled (language, direction, metadata, endonym
links), the formats page's values against Node's own Intl per locale, the entry
redirects and remembered choice, the language hint, concurrent locale requests, hydration without console errors,
client-only content and button interactions, the demo form's localized validation
and plural confirmation, same-tab language navigation, HTTP status and sitemap
behavior with every listed URL self-canonical and cross-linked by `hreflang`,
right-to-left mirroring, and narrow-screen overflow on every page. Lighthouse audits the site pages `/en`, `/es`, `/ar` and `/en/formats` (app pages are noindex by design)
in its accessibility, SEO, best-practices and agentic-browsing categories; the pinned
CLI excludes Performance by design, so Google's pinned `lighthouse` package gates that
category on `/en` (mobile and desktop) and `/en/formats`: a Performance score of at least
0.9 and lab Core Web Vitals within Google's good thresholds (LCP 2.5 s, CLS 0.1, TBT 200 ms). The same suite runs locally and against a deployed URL.
`project:verify` also type-checks, builds and dry-runs deployment packaging for the Worker. Chrome DevTools CLI is available for
manual snapshots, interactions and screenshots.

The Worker retains logs/traces configuration and emits redacted structured request
logs locally. Hosted logs, traces and Google indexing need a subsequent deployment
and external validation. Canonical URLs currently use the request origin; choose
the production public origin before deployment. This proof contains no Better Auth
server, credentials, sessions, D1 database, authorization or cross-app SSO.

Known tooling notices: Node may print the Chrome DevTools localStorage experimental
warning; npm reports unapproved upstream install scripts; Vite's isolated package
check may report that Base UI's `use client` directives are ignored in a plain
client bundle. These notices do not change the tested behaviors.
