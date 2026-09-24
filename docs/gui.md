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
bindings and observability. Vite generates `build/server/wrangler.json` and
`.wrangler/deploy/config.json`; do not hand-edit or commit either generated file.
Both local preview and Wrangler deployment consume the generated production build.
Development uses the same Worker source and Cloudflare runtime with hot reload.

| Task | Target |
| --- | --- |
| `project:dev` | Local Workers, hot reload, port 5173 |
| `project:build` | Build and Wrangler deployment dry run; no upload |
| `project:preview` | Build, then serve the production artifact locally on 4173 |
| `project:test` | Build, then test that artifact locally |
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
| `/` | Redirect to the best available locale from `Accept-Language`, else `/en` |
| `/en`, `/es`, `/ar` | Server-rendered public page with localized content, direction, metadata and alternate links |
| `/en/demo`, `/es/demo`, `/ar/demo` | Client-rendered counter and a localized reservation form with validation and plural confirmation; indexable, listed in the sitemap; public demo, not an account screen |
| `/en/formats`, `/es/formats`, `/ar/formats` | Server-rendered examples of dates, ranges, relative time, numbers, compact numbers, units, currencies and their minor units, plurals, ordinals, value variants, interpolation, locale-aware sorting, region and currency names, endonyms and reading direction |
| `/robots.txt`, `/sitemap.xml` | Public crawl metadata; the sitemap lists every public path in every locale with `hreflang` alternates |
| Unknown route or locale | HTTP 404 |

React Router runs through Cloudflare's Vite plugin. Demo routes render a localized
loading fallback on the server and mount the interactive view after the client
loader runs. The document shell is still server-rendered. This is not a claim that
React Router's entire SSR setting varies per route.

Route-module splitting is disabled for the pinned React Router version: production
tests exposed a hydration mismatch when the demo's client loader and fallback were
split. Keep the production browser check passing before enabling that optimization.

## Structure and reuse

- `app/`: route modules, page layout and app-specific styling.
- `workers/app.ts`: Worker entry, request IDs and structured status/timing logs.
- `packages/ui/`: shadcn/Base UI button, Remy's theme, compiled Paraglide messages, and locale direction and endonym helpers.
- `tests/gui.spec.ts`: browser and HTTP acceptance checks.

The button and theme are sourced from Remy Sport's existing shadcn conventions.
Both rendering modes import the package's public exports. Locale is passed
explicitly into compiled message functions; concurrent requests share no mutable
locale state. English, Spanish and Arabic are the catalogs; the Arabic catalog was
written by an agent and is unreviewed. Direction, endonyms, dates, numbers,
currency and plurals follow the decisions recorded in
[the GUI plan](../.plans/gui.md#dates-numbers-currency-and-direction).

```sh
mise run ui:pack           # Produce remy-ui-0.0.0.tgz locally
mise run ui:verify         # Install the tarball into a temporary consumer and build it
```

The package currently exports TSX and CSS for Vite/Tailwind consumers. The package
check installs the actual tarball outside the workspace, so hidden sibling imports
and missing generated files fail. It uses the pinned Vite/Tailwind build tools and
npm's cache/network for consumer dependencies. Nothing is published.

## Evidence and limits

The automated checks cover catalog parity and plural-category coverage, every
locale's HTML with JavaScript disabled (language, direction, metadata, endonym
links), the formats page's values against Node's own Intl per locale, root language
negotiation, concurrent locale requests, hydration without console errors,
client-only content and button interactions, the demo form's localized validation
and plural confirmation, same-tab language navigation, HTTP status and sitemap
behavior with every listed URL self-canonical and cross-linked by `hreflang`,
right-to-left mirroring, and narrow-screen overflow on every page. Lighthouse audits `/en`, `/es`, `/ar`, `/en/demo` and `/en/formats`
in its accessibility, SEO, best-practices and agentic-browsing categories; the pinned
CLI excludes Performance by design. The same suite runs locally and against a deployed URL.
`project:verify` also type-checks, builds and dry-runs deployment packaging for the Worker
and verifies the isolated package consumer. Chrome DevTools CLI is available for
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
