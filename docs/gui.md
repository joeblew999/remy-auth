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
| `project:test:google` | Level 2: Lighthouse audits and Core Web Vitals locally (slow; CI runs it on every push) |
| `cf:deploy` | Build, then upload to the authenticated Cloudflare account |
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

## What is implemented

| Route | Behavior |
| --- | --- |
| `/`, `/demo`, `/formats` | Redirect to the visitor's language: Paraglide's `cookie` (a remembered choice), then `preferredLanguage` (Accept-Language), else English, with `Vary`. These entry URLs are the `x-default` targets |
| `/en`, `/es`, `/ar` | Server-rendered public page with localized content, direction, metadata and alternate links |
| `/en/demo`, `/es/demo`, `/ar/demo` | Client-rendered counter and a localized reservation form with validation and plural confirmation; indexable, listed in the sitemap; public demo, not an account screen |
| `/en/formats`, `/es/formats`, `/ar/formats` | Server-rendered examples of the locale's calendars, numbering system, hour cycle, week start and weekend, dates, ranges, relative time, the visitor's country, city, region and local time from Cloudflare's request geolocation (server-rendered, never stored), the device's own time zone (browser-rendered), numbers, compact numbers, units, currencies and their minor units, plurals, ordinals, value variants, interpolation, locale-aware sorting, region and currency names, endonyms and reading direction |
| `/robots.txt`, `/sitemap.xml` | Public crawl metadata; the sitemap lists every public path in every locale with `hreflang` alternates |
| Unknown route or locale | HTTP 404 with the localized not-found page (an un-localized unknown path first redirects to the visitor's language, as TanStack's rewrite canonicalizes it) |

Localized pages never redirect. When the visitor's preferred language differs from the page, a dismissible hint offers that version; choosing or dismissing is remembered in Paraglide's `PARAGLIDE_LOCALE` cookie, which only the entry URLs act on. Locale detection, the cookie, URL localisation and the redirect are Paraglide's own strategies and middleware (`packages/ui/paraglide.mjs` holds the one compiler configuration), wired as Paraglide's official TanStack Start integration: the middleware wraps the Worker entry, and the router's `rewrite` removes the locale before matching and adds it to every link, so routes carry no locale segment.

TanStack Start runs through Cloudflare's Vite plugin. Home and formats are server-rendered;
the demo route is `ssr: false`, so the server sends the document, its metadata and a
localized loading fallback, and the browser renders the interactive view. In-app links
preload their route's code and data on intent; language changes are full navigations.

## Structure and reuse

- `src/routes/`: TanStack file routes (loaders, `head`, per-route rendering) that render the package's pages, plus this app's extra formats rows, and `robots.txt` and `sitemap.xml` as server routes; `src/routeTree.gen.ts` is generated by the router plugin during dev and build and committed. `publicPaths` from the package is the single list of public paths.
- `src/server.ts`: Worker entry through the package's `localizedWorker` (request IDs, structured status logs, `/healthz`, Paraglide's middleware, entry redirects). Start receives the original request, so server functions read Cloudflare's geolocation from `request.cf` (`src/place.ts`).
- `packages/ui/`: shadcn/Base UI button, Remy's theme, compiled Paraglide messages, Paraglide's locale runtime (detection, cookie, URL localisation) re-exported, hreflang data, the language switcher and hint, TanStack Router and Start glue, the shared Playwright checks and config, so consumers get the whole behaviour in either rendering mode.
- `tests/gui.spec.ts` and `tests/lighthouse.spec.ts`: the package's shared checks (`@joeblew999/remy-ui/checks`) plus the checks only this repository owns (catalogs, concurrent server renders, hydration, its extra formats rows).

The button and theme are sourced from Remy Sport's existing shadcn conventions.
Both rendering modes import the package's public exports. Locale is passed
explicitly into compiled message functions; concurrent requests share no mutable
locale state. English, Spanish and Arabic are the catalogs; the Arabic catalog was
written by an agent and is unreviewed. Direction, endonyms, dates, numbers,
currency and plurals follow the decisions recorded in
[the GUI plan](../.plans/done/gui.md#dates-numbers-currency-and-direction).

```sh
mise run ui:pack           # Produce the package tarball locally
mise run ui:components     # Regenerate the shadcn components from the registry
```

The package exports TSX and CSS for Vite/Tailwind consumers. Its real consumer is
[remy-auth-app](https://github.com/joeblew999/remy-auth-app), which installs the published
package and runs the package's own checks in client rendering, while this app runs them
in server rendering.

## Evidence and limits

The automated checks cover catalog parity and plural-category coverage, every
locale's HTML with JavaScript disabled (language, direction, metadata, endonym
links), the formats page's values against Node's own Intl per locale, the entry
redirects and remembered choice, the language hint, concurrent locale requests, hydration without console errors,
client-only content and button interactions, the demo form's localized validation
and plural confirmation, same-tab language navigation, HTTP status and sitemap
behavior with every listed URL self-canonical and cross-linked by `hreflang`,
right-to-left mirroring, and narrow-screen overflow on every page. Lighthouse audits `/en`, `/es`, `/ar`, `/en/demo` and `/en/formats`
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
