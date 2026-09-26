# All in on TanStack: Start, Router and Query across both apps and the shared package

Status: done, closed 2026-09-25 (see [Close-out](#close-out-2026-09-25)). Agreed by the owner 2026-09-25. Owner: remy-auth. Executor/Reviewer roles as in
the [auth plan](../parked/auth-service.md). Replaces React Router in remy-auth, remy-auth-app and
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

All seven are done; the evidence is in the [close-out](#close-out-2026-09-25).

1. **Spike and skills (about 1 hour).** Pin the versions above. Done 2026-09-25: 22 of the 23
   TanStack skills installed from `TanStack/router` at `ddad69a`, scanned first. Swapped on
   branch `tanstack`: the `remix-run/react-router` source is gone and TanStack's `react-router`
   skill (React bindings) is the 23rd; both use that name, and skills install flat by name, so
   they cannot coexist. In a scratch app, prove the four
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
   remy-auth done on branch `tanstack` (2026-09-25): typed search params, loader caching and
   intent preloading, navigation blocking, the validated server function with request-ID
   middleware, Query with the live status card, deferred place, problem pages and the time zone
   sub-resource, server route caching and 405, execution boundaries, dev-only devtools, and
   code-splitting and build-boundary checks, each with its shared check in
   `packages/ui/src/showcase/`. The deferred place resolves before the shell flushes on the
   server (Cloudflare's `cf` is synchronous), so streaming is proven on client navigation and by
   the chunked response rather than by a server-visible skeleton; no artificial delay was added.
6. **Shared tasks.** `project.toml` swaps `react-router typegen`, `dev` and `build` for the
   TanStack/Vite equivalents; consumers pick it up by bumping the include.
7. **Ship.** Both level-1 gates, local release, both deploys, live checks in the background,
   CI level 2; update the done GUI plan, `docs/content/dev/gui.md`, `docs/content/dev/tooling.md`, the package README
   and memory; merge both branches.

Estimate: about a day for items 1 to 4, and another day for the showcase.

## Acceptance

- Every shared check passes unchanged in both apps, locally and live: no-JavaScript metadata
  and hreflang, entry redirects, the hint, demo, formats, request IDs and liveness, Lighthouse
  and Core Web Vitals.
- No `react-router` dependency remains in either app or the package.
- The TanStack skills are installed through the shared tasks and listed in the lockfile.
- In-app links prefetch on intent; language switches remain full navigations.
- A hands-on pass on the deployed preview (see [how we work](../../docs/content/dev/how-we-work.md#multi-agent-work)) finds nothing that feels bad.

## Hands-on pass (2026-09-25)

On the Cloudflare preview `https://tanstack-remy-auth.gedw99.workers.dev`, phone viewport, Fast 4G,
4x CPU, in Chrome through its DevTools. All 46 level-1 checks passed against the preview too.

| Piece | How it felt | Action |
| --- | --- | --- |
| Formats search params | Controls answer at once with no page load; Arabic reads right to left with the Hijri date and three-decimal dinar | None |
| Demo server function | The reply arrives in the page's language | A failed call used to leave the form silent; it now says "Please try again" |
| Leave warning | Asks in the page's language, only while input is unsaved | None |
| Live status card | Sat below the footer, outside the page, so it looked broken | Moved inside the home page through a new `HomePage` children slot |
| Language hint | On a phone its text ran under its two buttons (shadcn's `AlertAction` is absolutely placed) | Buttons now flow under the text |
| Not-found and error pages | Bare page without logo, language switch or footer: felt like leaving the site | Rendered inside the shared `Shell` |
| First paint under DevTools network throttling | Held until the scripts load, about 2.7 s on Fast 4G and 11 s on Slow 4G, on this branch and on the live React Router site alike | Root cause under investigation; not a regression |

## Close-out (2026-09-25)

| Item | Evidence |
| --- | --- |
| 1 Spike and skills | The 23 TanStack skills are in `skills-lock.json`, installed by `mise run project:setup` |
| 2 Package | `@joeblew999/remy-ui` 0.9.0 released (commit `d9b042a`): `tanstack.tsx` replaces the React Router glue; no `react-router` dependency remains |
| 3 remy-auth | TanStack file routes in `src/routes`; live at https://remy-auth.gedw99.workers.dev/en on 0.10.2 |
| 4 remy-auth-app | Prerendered on TanStack Start; live at https://remy-auth-app.gedw99.workers.dev/en on the 0.10 line |
| 5 Showcase | Every row of the table above has its shared check in `packages/ui/src/showcase/`; both apps run them |
| 6 Shared tasks | `tasks/project.toml` runs the TanStack/Vite dev and build; consumers include it by tag ([tasks README](../../docs/content/dev/tasks.md)) |
| 7 Ship | 0.9.0 and 0.9.1 released, both apps deployed, then 0.10.0 to 0.10.2 on the same foundation; [`docs/content/dev/gui.md`](../../docs/content/dev/gui.md) and the [package README](../../docs/content/dev/ui-package.md) updated at close |
| Hands-on pass | [Above](#hands-on-pass-2026-09-25), on the preview before the merge; its fixes are on main |

Moved elsewhere: the formats page's speed (Google's simulated mobile LCP, live) is an item in
[now](../now.md); regrouping the formats page shipped in 0.10.2; the auth slice continues in
the [auth plan](../parked/auth-service.md).

## Decisions

1. **TanStack Query: now.** It is part of the showcase (the live status card), and the auth
   slice needs it next.
2. **Server functions for the demo form: yes.** They show typed server calls with server-side
   validation; the form keeps its client-side validation as well.
