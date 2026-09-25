# Parts: add or remove a piece of any Remy app in one line

Status: proposed 2026-09-25 under the owner's delegation. Owner: remy-auth. Executor/Reviewer roles
as in [plans and roles](../docs/development.md#plans-and-roles). Owner, 2026-09-25: parts of the GUI (some for operations,
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
