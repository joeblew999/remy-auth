# Parts: add or remove a piece of any Remy app in one line

Closed 2026-09-26: the mechanism and four parts (time-zones, deferred-place, seo-routes, status-card) in remy-ui 0.11.0; leave-guard, search-params and observability stay package modules (reasons below); "Writing a part" is in packages/ui/README.md. remy-auth-app adopts parts when it wants them.

Status: proposed 2026-09-25 under the owner's delegation. Owner: remy-auth. Executor/Reviewer roles
as in [plans and roles](../../docs/development.md#plans-and-roles). Owner, 2026-09-25: parts of the GUI (some for operations,
some for testing) will be wanted again and again; adding and removing them from any Remy app must
be child's play.

## What a part is

A part is one folder in `@joeblew999/remy-ui` (`src/parts/<name>/`) that owns everything it needs:
its UI, routes, server code, messages and checks. An app lists the parts it uses in one file;
adding or removing a part is one line there. No other file in the app changes.

## Parts we already have

| Part | Kind | Contributes today, wired by hand in several files |
| --- | --- | --- |
| observability | ops | Worker wrapper (request ID, log line, `/healthz`), function middleware logging `server_fn` |
| status-card | ops | home-page card, query, server function, checks |
| devtools | dev | TanStack Devtools with Router and Query panels (`__root.tsx`), stripped from production builds by the `devtools()` Vite plugin |
| seo-routes | ops | `robots.txt`, `sitemap.xml` server routes |
| problem-pages | feature | localized not-found and error pages, checks |
| leave-guard | feature | demo form's leave warning, checks |
| search-params | showcase | formats controls in the address, checks |
| deferred-place | showcase | streamed Cloudflare location, checks |
| time-zones | showcase | `/time-zones/$` page, `notFound()`, checks |

## Where a part plugs in, using TanStack's own extension points

| Contribution | Hook | Source |
| --- | --- | --- |
| Routes | `tanstackStart({ router: { virtualRouteConfig } })` with `physical(prefix, dir)` mounting the part's route directory beside the app's `src/routes` | `@tanstack/virtual-file-routes` 1.x `api.d.ts`; `start-plugin-core` schema accepts `virtualRouteConfig` |
| Request and server-function middleware | `createStart(() => ({ requestMiddleware, functionMiddleware }))` built from the parts list | TanStack Start `middleware` skill |
| Worker-level wrapping | options of the package's `localizedWorker` | our package |
| UI inside pages | the pages' `children` and `extras` slots | our package |
| UI at the root | one slot in `__root.tsx` rendering each part's root element | our package |
| Messages | keys prefixed with the part's name in the package catalogs | Paraglide |
| Checks | the part's `checks.js`, called from one line in the app's test file | our package |
| Tasks | the part's namespace file in `tasks/` | mise include |

## The one hard problem: one list read in four places

The browser bundle, the Worker, the Vite config (routes) and Playwright (checks, plain Node that
does not transpile TSX from `node_modules`) all need the list. Two candidates, to settle in the
spike:

1. **A data file.** `src/parts.json` holds names and options. The Vite config reads it for routes;
   Playwright reads it for checks; the runtime gets it through a package registry that maps names to
   modules with static imports, so unused parts are tree-shaken.
2. **A Vite virtual module.** A small Vite plugin from the package reads the list and generates
   `virtual:remy-parts` with static imports of exactly the listed parts; routes through
   `virtualRouteConfig`; Playwright reads the same list file.

Choose by: lines an app writes to add a part (target: one), unused parts absent from the bundle
(proved by the build-boundary check), type safety of options, and how little custom code the
package owns. Survey first whether an existing Vite or TanStack plugin already does this.

## Spike result (2026-09-25): candidate 2

Both candidates were built on a scratch copy with two parts (status-card and time-zones) and pass
level 1 with both parts, and with either removed; each needs one line to add or remove a part.
**Chosen: candidate 2, a Vite virtual module generated from `src/parts.json`**, with routes through
`tanstackStart`'s `virtualRouteConfig` and `physical()`. It is the only one where a removed part
leaves no code in `dist/client` and no callable server function; with candidate 1 the removed card
stayed in the bundle and its server function still answered 200.

Found by the spike, to design in: a part's route file under `packages/ui/src/parts/` is still
type-checked by remy-auth's `tsconfig` when remy-auth leaves the part out (7 errors; the build
passes), so the package's own typecheck must include every part; links between parts (the
location card links to `/time-zones/$`) fail at runtime when the target part is absent, so parts
declare their dependencies; `parts.json` is untyped (a typed `parts.ts` with `satisfies` is
untested); middleware contributions were not exercised.

## Conversion, first pass (2026-09-25)

Done under the owner's delegation ("pump and deploy fast, no tests": only `project:check` ran; no
test tier). **Mechanism:** `src/parts.json` (one name per line) is read by `readParts` (`./parts`:
unknown names, duplicates and missing `requires` fail the build and the checks); `remyParts()`
(`./parts/vite`) mounts listed parts' route directories with `rootRoute('__root.tsx', [physical('', '.'), physical('', <part>/routes)...])`
and generates `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` (`./parts/checks`) runs listed
parts' checks. The generated route tree keeps every route ID and path. **Converted:** `time-zones`
(route moved to `packages/ui/src/parts/time-zones/routes/`; its checks split out of `problemChecks`'s
call). To let a part's route render pages, `problem-pages` moved into the package (`./problem`) and
`usePreferred` too (`./preferred`); problem pages stay always-on (every route uses them), so they
are a package module, not a removable part.

Decided: remy-auth's `tsconfig` excludes `packages/ui/src/parts/*/routes`; a listed part's route is
still type-checked because the route tree imports it, and an unlisted one is not (the spike's
7 errors are gone). With `time-zones` removed the build passes and no zone route chunk ships; the
typecheck still fails on `src/showcase/deferred-place.tsx`'s typed `Link` to `/time-zones/$` (at
runtime it is already guarded by `hasPart`). It goes away when deferred-place becomes a part that
`requires` time-zones. Also: `project:check` type-checks the committed `routeTree.gen.ts` before the
build regenerates it, so after changing the list run a build (or dev) once first.

Not converted yet, each needing a design choice:

- **status-card**: it reads the app's own contract (`orpc.status` from `@joeblew999/remy-auth-contract`),
  which the package must not import. Options: the part takes its query from the app (a typed
  `parts.ts`, untested), or it reads the package-owned `/healthz` (a self-fetch on the server).
- **devtools**: the `devtools()` Vite plugin skips files under `node_modules`, so in an app that
  installs the package the devtools would not be stripped from production. Stays in `__root.tsx`.
- **seo-routes**: the sitemap lists this app's docs; needs a paths contribution per part first.
- **observability**: already the package's `localizedWorker`; middleware contributions through
  `createStart` are still unexercised.
- **leave-guard, search-params, deferred-place**: live inside the shared pages' slots; they need the
  page-slot contribution (`children`/`extras` from `virtual:remy-parts`).
- **remy-auth-app**: adopts the parts list when it moves to the next package release (not edited here);
  a physical route mount from `node_modules` is untried there.

## Conversion, second pass (2026-09-25)

Same delegation, same gate (`project:check` only). `src/parts.json` now lists `time-zones`,
`deferred-place`, `seo-routes` and `status-card`; `project:check` passes with the full list, with each
of them removed alone, and with the list empty. A removed `deferred-place` ships no place UI, a removed
`status-card` no card.

**Mechanism, added:** a part's `entries` become `virtual:remy-parts/<part>/<entry>` (the part's real
exports when listed, `undefined` when not, so the app writes `{DeferredPlace && ...}` and `getPlace?.()`
and nothing is left behind); a part's `app` options come from the app's own `src/parts/<part>.ts` as
`virtual:remy-parts/<part>/app` (this is the "typed parts.ts" the spike left open, one file per part,
typed by the package's `virtual.d.ts`); a part's `sitePaths` feed the sitemap and its checks. One module
per entry keeps TanStack's code splitting: a loader imports only the server function's entry, the
component the UI's.

Decided:

- **deferred-place: a part that does not `require` time-zones.** It links a zone to `/time-zones/...`
  only when `hasPart('time-zones')`, by the path from time-zones' own `timeZonePath`, not a typed route.
  A `requires` would make removing time-zones two lines (and a typed `Link` in always type-checked
  package code fails whenever the route is absent); now removing time-zones is one line. Without the
  part, `/app/location` shows the device's own place alone, as remy-auth-app does. Its checks (the
  streamed place, the Cloudflare rows of the formats page, the failing-navigation error page, which
  fails its server function) moved from remy-auth's test file into the part.
- **seo-routes: a part, each part contributing its paths.** Both routes and their cache/405 answers moved
  into the package; the sitemap lists the package's site pages, every listed part's `sitePaths` (none
  yet) and the app's own entries (`sitemapEntries` in `src/parts/seo-routes.ts`: remy-auth's docs,
  moved from its sitemap route unchanged). Site entries now use the package's `alternates()` (the same
  URLs `localizedPath` gives). The sitemap test moved out of `publicPageChecks` into `sitemapChecks`,
  which the part's checks run (remy-auth passes `sitemap: false`); the 404 check stays.
- **status-card: a part.** The app gives its status query (`orpc.status.queryOptions()`) in
  `src/parts/status-card.ts`; the part owns the card, its timing, its loader and its checks.
  `invalidateEverything` moved to the package (`./invalidate`). New optional peer `@tanstack/react-query`.
- **leave-guard: not a part.** It is one hook passed as the demo form's `onDirtyChange`; as a part the
  app would call a hook that may be `undefined` (against React's rules of hooks) or the package would
  ship a no-op stand-in, to save well under a kilobyte. Stays `showcase/navigation-blocking`.
- **search-params: not a part.** The address-bar controls are the formats page's own: its
  `validateSearch`, its controls slot, and the shared `formatsChecks`, which both apps run. Removing
  them would change the shared page, not drop a piece.
- **observability: not a part.** Request IDs, the log line and `/healthz` are required of every app
  (`observabilityChecks` on every page) and already live in the package's `localizedWorker`; the
  function middleware needs the app's service name and `env`. Always-on, like the problem pages.
- **devtools:** unchanged (first pass).

**Merged with the package moves (2026-09-25).** The two designs met on remy-auth's sitemap route and
test file; one design kept: parts stay the mechanism, and the parts use the package's builders
rather than their own. The seo-routes part's routes call `seo`'s `sitemapXml({ origin, paths, extra })`
and `robotsTxt` (the part's `sitemap.ts` keeps only the app-options type `SitemapEntries`); the
status-card part is the package's `showcase/status-card` card (which a consumer also mounts across
origins) fed the app's `statusQuery`, and `invalidateEverything(router, queryClient)` is main's.
`serverAppChecks` is part-aware (`parts`, default `src/parts.json` when present): with `seo-routes`
listed it passes `sitemap: false`, and the device-place row expects the network place only with
`deferred-place`; status-card, deferred-place and the seo routes' server-route checks were never in it.
remy-auth's `tests/gui.spec.ts` is one `serverAppChecks`, one `partChecks` and its own checks; the
`--list` titles before and after differ only by the moves above.

Still open: remy-auth-app adopts parts at the next package release (its sitemap and robots could then
be the seo-routes part, given an origin option for prerendering; untried); how to write a part in the
package README (work item 5).

## Work items

1. **Spike (about 2 hours):** both candidates with two parts, `status-card` (UI, query, server
   function) and `time-zones` (routes), in a scratch copy of remy-auth; measure the criteria above.
2. **Convert** the parts in the table, one folder each, with their checks.
3. **Both apps** list their parts; remy-auth-app lists only the ones prerendering allows.
4. **A check** that removing a part from the list removes its routes, bundle code and checks.
5. **Docs:** how to write a part, in the package README; the parts list in `docs/gui.md`.

## Acceptance

- Adding or removing any listed part is one line in one file of the app, and both levels pass
  either way.
- A removed part leaves no route, no bundle code and no check behind.
