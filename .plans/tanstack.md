# All in on TanStack: Start, Router and Query across both apps and the shared package

Status: agreed by the owner 2026-09-25; items 1 to 3 done on branch `tanstack` in remy-auth (level 1 green, package 0.9.0-rc.0 not published); showcase next. Owner: remy-auth. Executor/Reviewer roles as in
the [auth plan](auth-service.md). Replaces React Router in remy-auth, remy-auth-app and
`@joeblew999/remy-ui`, and goes all in (owner, 2026-09-25: "I want to see what it can really
do"): every TanStack strength is used somewhere visible and proven by a check. Done in a branch
in each repository; main keeps working until every gate passes.

## Why

TanStack gives the Remy app family type-safe search params, loader caching with stale-time
rules, typed server functions, React Query integration and per-route SSR modes. Those matter
most in the data-heavy apps to come (Remy Sport, Remy Data); switching now, with four pages
and no data, is the cheapest it will be, and avoids two routers in one family. Server-rendered
HTML without JavaScript is not a gain: React Router already does it, and the checks prove it.

## Verified 2026-09-25

| Need | Finding | Source |
| --- | --- | --- |
| Cloudflare Workers | `@cloudflare/vite-plugin` with `cloudflare({ viteEnvironment: { name: 'ssr' } })` and `tanstackStart()`; `main` is `@tanstack/react-start/server-entry` or our own entry; bindings via `import { env } from 'cloudflare:workers'` | [Cloudflare TanStack Start guide](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/) |
| Prerendering | `tanstackStart({ prerender: { enabled, crawlLinks, filter, failOnError, autoSubfolderIndex } })` plus a `pages` list; needs `@tanstack/react-start` 1.138 or later | [Static prerendering](https://tanstack.com/start/latest/docs/framework/react/guide/static-prerendering) |
| Per-route rendering | `ssr: true`, `false` or `'data-only'` on any route, default via `createStart(() => ({ defaultSsr }))`; replaces our demo route's `clientLoader` and fallback trick | [Selective SSR](https://tanstack.com/start/latest/docs/framework/react/guide/selective-ssr) |
| Paraglide | Official integration: `paraglideMiddleware` in the server entry, and the router's `rewrite: { input: deLocalizeUrl, output: localizeUrl }`, so routes carry no `:locale` segment; prerender paths from `localizeHref`; `getLocale()` in `__root.tsx` | [Paraglide TanStack Start](https://paraglidejs.com/tanstack-start) |
| Agent skills | `TanStack/router` ships 31 skills. For React and Start we take 23: `react-start`, `start-core`, `start-server-core`, `react-router` (TanStack's React bindings), `router-core`, `router-plugin`, `router-query`, `data-loading`, `navigation`, `path-params`, `search-params`, `type-safety`, `ssr`, `not-found-and-errors`, `code-splitting`, `middleware`, `server-functions`, `server-routes`, `execution-model`, `deployment`, `auth-and-guards`, `auth-server-primitives`, `migrate-from-react-router`. Left out: the Solid and Vue skills, `migrate-from-nextjs`, `server-components`, `virtual-file-routes`, and the contributor-only `bundle-size-optimization`. Paraglide (`opral/paraglide-js`, `opral/monorepo`, `opral/inlang`) and `TanStack/query` ship none | `skills add <repo> --list`, rechecked 2026-09-25 |
| Versions today | `@tanstack/react-start` 1.168.58, `@tanstack/react-router` 1.170.39, `@tanstack/router-plugin` 1.168.40, `@cloudflare/vite-plugin` 1.60.0 | npm |

Not yet verified, first thing in work item 1: reading `request.cf` (geolocation) in a loader or
server function; the shape of `head()` metadata for canonical and hreflang links; TanStack's
prefetch-on-intent default; how prerendering writes the locale-prefixed paths and the 404 page.

## What TanStack will show off, and where

Each row is built with the installed TanStack skill named in the last column and gets a shared
check, so it keeps working in both apps.

| Capability | Where it shows | Proven by | Skill |
| --- | --- | --- | --- |
| Typed, validated search params | Formats page controls in the URL: `?currency=JPY&count=11&calendar=islamic`, schema-validated with defaults, invalid values corrected, every `Link` typed | Check: bad params fall back; the page shows the chosen values; shareable URLs round-trip | `search-params`, `type-safety` |
| Intent preloading and loader caching | Every in-app link preloads on hover; going back reuses cached loader data (`staleTime`) | Check: hovering a link fetches its route before the click; back navigation makes no new request | `navigation`, `data-loading` |
| Server functions | Demo reservation submits through a validated `createServerFn`; the server re-validates and answers in the visitor's language | Check: server-side validation errors show without client validation; success message comes from the server | `server-functions` |
| Per-route rendering | Home and formats server-rendered; demo `ssr: false`; a live status panel `ssr: 'data-only'`; remy-auth-app fully prerendered | Existing no-JavaScript checks plus one per mode | `deployment`, `ssr` |
| Streaming and deferred data | Formats page streams its slow section (Cloudflare location, other calendars) behind `Await` with a pending skeleton | Check: first bytes arrive before the deferred part; the skeleton is replaced | `data-loading`, `ssr` |
| TanStack Query with the router | A live status card polling `/healthz` (release, service) with SSR dehydration, per-request QueryClient | Check: server HTML already holds the status; it refreshes in the browser | `router-query` |
| Server routes | `/healthz`, `/robots.txt`, `/sitemap.xml` as server routes instead of loaders returning Responses | Existing sitemap, robots and liveness checks | `server-routes` |
| Middleware | Global request middleware for Paraglide and the observability wrapper; server-function middleware adding the request ID to every server call's log line | Existing request-ID check extended to server-function calls | `middleware` |
| Not-found and errors | Typed `notFound()` with localized not-found and error components per route | Existing 404 checks plus a thrown error rendering the localized error page | `not-found-and-errors` |
| Navigation blocking | Demo form warns before leaving with unsaved input | Check: typing then clicking away asks first | `navigation` |
| Code splitting | `autoCodeSplitting`: each route's component loads on demand | Check: the demo route's chunk is not in the home page's first load | `code-splitting`, `router-plugin` |
| Execution boundaries | Geolocation and locale info through `createServerOnlyFn`; device time through `ClientOnly` | Type-check and build fail if server code leaks into the client bundle | `execution-model` |
| Devtools | Router and Query devtools in development only | Not in production bundles (build check) | `start-core` |

The auth slice will then use `auth-and-guards` and `auth-server-primitives` (sessions, CSRF,
OAuth with PKCE) on the same foundation. Two choices here shape it (see the auth plan's "Roles and
relationships on TanStack"): cache keys for loader data and Query must be able to include the
user and organization, and the shared glue should expose one invalidate-everything call for
logout and role changes; the showcase's caching rows use public data only.

## Work items, in order

1. **Spike and skills (about 1 hour).** Pin the versions above. Done 2026-09-25: 22 of the 23
   TanStack skills installed from `TanStack/router` at `ddad69a`, scanned first. At migration,
   swap the `remix-run/react-router` source for TanStack's `react-router` skill: both use that
   name, and skills install flat by name, so they cannot coexist. In a scratch app, prove the four
   unverified points above on Cloudflare's local host. Stop and report if any is a blocker.
2. **Package (`@joeblew999/remy-ui`).** Replace `react-router.tsx` with `tanstack.tsx`: the
   server-entry wrapper combining `paraglideMiddleware` and `withObservability`, the router
   `rewrite`, `head()` helpers producing title, description, canonical and hreflang,
   `requireLocale`'s replacement (likely unnecessary with the rewrite), and the preferred
   language for the hint. Pages switch `Link` to TanStack's with intent prefetch. The components,
   catalogs, checks, samples, paths and `playwrightConfig` stay. Peer dependency moves from
   `react-router` to `@tanstack/react-router`. Release as 0.9.0.
3. **remy-auth.** File routes in `src/routes` without `:locale`; the home and formats routes
   server-rendered; the demo route `ssr: false`; the Cloudflare context via `cloudflare:workers`
   and the request's `cf`; entry URLs redirected by Paraglide's middleware as now; sitemap and
   robots as server routes. The shared checks must pass unchanged.
4. **remy-auth-app.** Prerendered with `prerender` and the `localizeHref` path list; its thin
   observability Worker in front of the assets stays; entry pages as now. The shared checks must
   pass unchanged.
5. **Showcase.** Build the rows of the table above, in that order, each with its shared check,
   in both apps where the rendering mode allows (streaming and the data-only panel are
   server-side, so remy-auth only; remy-auth-app shows the prerendered and client-side ones).
6. **Shared tasks.** `project.toml` swaps `react-router typegen`, `dev` and `build` for the
   TanStack/Vite equivalents; consumers pick it up by bumping the include.
7. **Ship.** Both level-1 gates, local release, both deploys, live checks in the background,
   CI level 2; update the done GUI plan, `docs/gui.md`, `docs/tooling.md`, the package README
   and memory; merge both branches.

Estimate: about a day for items 1 to 4, and another day for the showcase.

## Acceptance

- Every shared check passes unchanged in both apps, locally and live: no-JavaScript metadata
  and hreflang, entry redirects, the hint, demo, formats, request IDs and liveness, Lighthouse
  and Core Web Vitals.
- No `react-router` dependency remains in either app or the package.
- The TanStack skills are installed through the shared tasks and listed in the lockfile.
- In-app links prefetch on intent; language switches remain full navigations.

## Decisions

1. **TanStack Query: now.** It is part of the showcase (the live status card), and the auth
   slice needs it next.
2. **Server functions for the demo form: yes.** They show typed server calls with server-side
   validation; the form keeps its client-side validation as well.
