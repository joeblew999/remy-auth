# Contract-first APIs on TanStack: producing and consuming OpenAPI

Closed 2026-09-26: items 2-6 built on oRPC 1.15.4 (contract 0.2.0 published with remy-ui 0.11.0); move to oRPC 2.0 when it ships is a future item.

Status: decided 2026-09-25 (2.0 rechecked 2026-09-26) under the owner's delegation, from a scored survey with scratch proofs
(below). It builds on the [TanStack move](tanstack.md), on main since release 0.9.0. Owner:
remy-auth. Executor/Reviewer roles as in [plans and roles](../../docs/development.md#plans-and-roles). Tools were chosen by
survey, as [how we work](../../docs/how-we-work.md) requires.

## Goal

Strict compile-time and runtime type safety, with servers and clients kept in step through
OpenAPI, in two halves:

- **Producing:** every endpoint an app serves is defined first as a contract (method, path, input,
  output and errors as Zod 4 schemas). The server implements the contract, and the OpenAPI
  document is generated from it, never written by hand.
- **Consuming:** every API an app calls is reached through a typed client whose requests and
  responses are validated at runtime.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Producing | oRPC 1.15.4, contract-first: `oc.errors().route().input().output()` in a contract, `implement(contract)` on the server | Only candidate proved to validate both directions by default; generates OpenAPI 3.1 from the contract alone with typed errors and per-operation security; official TanStack Start adapter and TanStack Query utilities. Scored 34 of 36; runner-up Hono with @hono/zod-openapi at 26 |
| oRPC version | **1.15.4** (decided 2026-09-25 from the spike); move server and clients together when 2.0.0 final ships | Spike on both (TanStack Start 1.168 on Workers): Start, Router and Query integration are the same; 2.0 adds Query conveniences and OpenAPI 3.2 by default, but costs +3.3 KiB gzip in the client and +16.7 KiB in the Worker, moves HTTP status out of contract errors into a separate `errorStatusMap`, and makes a client validation failure look like a server 500. Moving the spike's contract to 2.0 took 7 lines. Not yet measured: Worker CPU for parsing, `OpenAPIReferencePlugin`, `zod/mini` |
| Mounting | A Start server route `src/routes/api.$.ts` with `OpenAPIHandler`; `RPCHandler` only if the app's own pages need it | Start owns routing and the Worker entry; the adapter documents this route |
| Server functions | Only for page glue that no other client calls (locale, device, place) | They produce no OpenAPI, validate input only and live under `/_serverFn/*`, not stable paths |
| Server-side calls | `createRouterClient` inside loaders, through `createIsomorphicFn`; the browser uses the link | No HTTP hop on the server; oRPC's documented pattern |
| TanStack Query | `createTanstackQueryUtils(client)` for `queryOptions` and `mutationOptions`; loaders call `ensureQueryData`; SSR hydration with oRPC's serializer in `setupRouterSsrQueryIntegration` | Query keys come from the contract |
| Consuming another Remy API | Import that app's published contract and call it through `OpenAPILink` with `ResponseValidationPlugin`; no code generation | Types are the contract itself, so nothing can drift; responses are still checked at runtime |
| Where a contract lives | A small package per producing app, `@joeblew999/<app>-contract`, holding only Zod schemas and the contract, released with the app | Consumers need the contract without the server |
| Consuming third-party APIs | Not built until an app needs one. Then Kubb 5, proved first; fallback @hey-api/openapi-ts 0.99.0 | Kubb and Hey API tie at 19 of 21; Kubb wins on semver releases, 6 open issues against 639, and bringing its own TypeScript 6. Hey API is proved, but crashes on our TypeScript 7 unless run from a separate folder with TypeScript 6.0.3, and has published no release since June |
| Reference page | oRPC's `OpenAPIReferencePlugin` at `/api/doc`; document at `/api/openapi.json` | As remy-sport, no extra package |
| No committed spec | The document is generated in-process from the contract | One home for the facts: the contract. remy-sport works this way too |
| Shared code | `@joeblew999/remy-ui/api/*` (`server`, `client`, `coverage`, `checks`): server-route handler, isomorphic client factory, spec options, the coverage check | Shared mechanism, app-owned contracts, as in refined C |

## Evidence

Scores are 0 to 3 per criterion. Rows marked "proved" were built and run in scratch projects
under TypeScript 7.0.2, Zod 4.6.5 and Node 26.10.0 on 2026-09-25.

**Producing** (criteria: contract-first, OpenAPI 3.1 with errors and security, runtime validation,
client types without generation, TanStack Query, Start on Workers, maturity, Zod 4, size; the
starred ones count double)

| Candidate | Score | Deciding facts |
| --- | --- | --- |
| oRPC 1.15.4 | 34 of 36 | Proved: 3.1 from the contract, typed 404, bad input 400, bad output 500, compile errors for a wrong handler, a client typo or a missing procedure. About 1M weekly downloads; mostly one maintainer |
| Hono 4.13.9 + @hono/zod-openapi 1.6.3 | 26 | Proved: validates requests only, a wrong response went out as 200. Its client needs the implemented app's type, not a contract |
| tRPC 11.19 + trpc-to-openapi 3.3 | about 27 | Third-party bridge; errors are status codes without typed bodies; its fetch handler goes through Node's HTTP handler |
| Effect HttpApi 0.97 | about 26 | Strong, but Effect Schema only, no Zod |
| TanStack Start server functions | ruled out | No OpenAPI; runtime validation of input only |
| ts-rest 3.52 | about 23 | Last release June 2025, OpenAPI 3.0 only, Zod 4 only in a release candidate |
| Elysia, chanfana, hono-openapi | 16 to 19 | Elysia's Workers adapter is experimental; chanfana has no typed client; hono-openapi does not validate responses |

**Consuming third-party OpenAPI** (criteria: 3.1, request and response validation, TanStack
Query, Zod 4, fetch on Workers, maturity, size)

| Candidate | Score | Deciding facts |
| --- | --- | --- |
| Kubb 5.3 | 19 of 21 | Validates both ways through Standard Schema; `queryOptions` output; semver; 5.0 released 2026-08-17, plugin versions differ |
| @hey-api/openapi-ts 0.99.0 | 19 | Proved: rejects bad requests before sending and bad responses with a ZodError, typed errors narrow. Needs a TypeScript 6 folder under our TypeScript 7; 0.x with breaking minors |
| orval 8.37.0 | 18 | Proved: validates responses only, and parses error bodies with the success schema |
| typed-openapi 4.1 | 17 | Strict objects by default reject fields a third party adds later; two majors in a month |
| openapi-typescript family | 14 | Types only, no runtime validation |
| openapi-qraft, openapi-zod-client/Zodios | under 10 | No validation, or Zod 3 and unmaintained |

## Type safety, layer by layer

1. **Compile time:** strict TypeScript; types flow from contract to handler, client, TanStack
   Query and components; `tsc` in level 1.
2. **Server at runtime:** oRPC validates every input (typed 400) and every output (500 rather than
   sending what the document does not promise).
3. **Client at runtime:** responses are parsed against the contract's schemas before use; a
   mismatch is a typed error, never silently wrong data.
4. **Coverage:** a check walks the router and fails when a procedure lacks a route, a policy from
   refined C's guard, or documented errors.

## Work items, in order

1. **Spike (about 2 hours):** first review oRPC 2.0: its release notes and migration guide, what it adds for TanStack Start, Router and Query, and whether 2.0.0 is out. Build the spike on 2.0 and on 1.15.4 and record the choice above. Then, on the chosen version, oRPC inside TanStack Start on the Workers runtime: the server
   route, the router client in a loader, Query utilities with SSR hydration, `ResponseValidationPlugin`
   on an `OpenAPILink`. Measure the Worker bundle size and CPU cost of parsing.
2. **Package `api` module** and the shared `api:*` tasks in `tasks/api.toml`.
3. **remy-auth produces:** the demo reservation and the status card move to contract endpoints
   (`POST /api/reservations`, `GET /api/status`); the contract package `@joeblew999/remy-auth-contract`
   is released by the local release script.
4. **remy-auth-app consumes** that contract for its status card; CORS limited to its registered origin.
5. **Checks** in both apps: coverage, a schema-violating response rejected, invalid input giving
   the typed 400 in every locale.
6. **Ship** with both levels, releases and both deploys, then a hands-on pass as in
   [how we work](../../docs/how-we-work.md#multi-agent-work).

## Progress and decisions, 2026-09-25 (branch contract-api)

Done in remy-auth, under the owner's delegation: item 2 (package `api/*` and `api:spec`), item 3
without the release (the contract is `packages/contract/`, private; its
[README](../../packages/contract/README.md) says how to publish it), and item 5's checks for remy-auth
(`apiChecks`, `reservationApiChecks`, the status card's check on `/api/status`). Items 4 and 6: see
the next section. Decisions, each with its reason:

| Decision | Choice | Why |
| --- | --- | --- |
| Paths | Contract routes carry the full path (`/api/status`); the handler has no prefix | The document shows the real URLs, and a consumer's link needs only the origin |
| Where the reservation shapes live | `reservationInput`, `reservationFieldErrors`, `reservationConfirmation` stay in `packages/ui/src/reservation.ts` beside the rules; the contract imports them and takes `@joeblew999/remy-ui` as a peer | `DemoPage` is shared by both apps; one home for the reservation, and the UI package never depends on an app's contract |
| Invalid input | Broken rules are the typed `INVALID_RESERVATION` (400, first broken rule per field, in the asked language); a body of the wrong shape is oRPC's own `BAD_REQUEST` (400), which the generated document lists as the undefined-error alternative | The rules' messages depend on the language, so they cannot be the contract's input schema; the input schema stays language-neutral |
| Language of an API call | Paraglide's `routeStrategies`: `/api/*` uses `preferredLanguage`, then `baseLocale`; the app's client sends the page's language as Accept-Language | Paraglide owns language; no redirect of `/api` documents and no cookie deciding for another tab; plain HTTP clients get standard content negotiation |
| Policy | `meta.policy`, `'public'` for both endpoints until refined C's guard exists | The coverage rule needs a policy to check now; the type widens to the guard's actions later |
| Documented errors | Required for every procedure that takes input; `GET /api/status` has none of its own | A procedure without input cannot reject input; its failures are oRPC's undefined 500 |
| Coverage walks | The implemented router (`src/api/router.ts`), which has no Workers imports, so Playwright loads it in Node | The router is what the route mounts; the release reaches it through the call's context |
| Server-side calls | `isomorphicClient` in the package takes the app's `createServerOnlyFn(() => createRouterClient(router, ...))` | The Start compiler strips the server-only body in the browser build, so the router never ships (checked: only the contract is in `dist/client`) |
| SSR hydration serializer | Not added | Contract outputs are plain JSON, which TanStack's own dehydration carries; add oRPC's serializer when an output holds a Date, BigInt or the like |
| Per-call log line | None beyond the Worker's `http_request` line | That line already has the route (`/api/reservations`), status and request ID; `server_fn` lines existed because `/_serverFn/<id>` routes are opaque. Calls from server loaders are not logged separately |
| Reference page script | Scalar pinned to 1.72.0 (`scalarScript` in `api/server`) | oRPC's default URL follows Scalar's latest release |
| Shared tasks | A file task `api:spec` (`tasks/api/spec`, `--urls` for the list) instead of `tasks/api.toml` | Same form as `cf:urls`; it asks a running Worker, because the document is generated, never committed |
| Server function checks | `serverFunctionChecks` stays in the package but remy-auth no longer calls it; `reservationApiChecks` asserts the same things over HTTP (validation again, page language despite the cookie, request IDs, 400 for a malformed call) | The reservation is no longer a server function; the check is kept, not deleted, for any app whose `onReserve` still is one |

## Progress and decisions, 2026-09-25 (items 4 and 6)

Item 4 is built: remy-auth on this branch, remy-auth-app on its branch `contract-status-card`
(needs the release below before its `npm ci` works). Item 6 is prepared, not run: the contract is
no longer private and `scripts/release.sh` and the tag's CI job publish it; no release, deploy or
hands-on pass was made (owner's rule for this run). Checks were written, not run (tier 0 only).

| Decision | Choice | Why |
| --- | --- | --- |
| Where the registered origins live | `src/api/origins.ts` in remy-auth, one exact origin per app (remy-auth-app's `DEPLOY_ORIGIN`); `apiHandlers(router, { origins })` passes them to oRPC's `CORSPlugin`; a wildcard throws | One home the route and the check both read; moves to refined C's registered clients when they exist |
| Which origins | Deployed origins only; not the consumer's local, test or throwaway preview origins | "Limited to its registered origin"; local runs must not depend on production remy-auth |
| When the consumer asks | Only the build for `DEPLOY_ORIGIN` gets `REMY_AUTH_ORIGIN` (the consumer's `vite.config.ts` defines it when `PUBLIC_ORIGIN` equals `DEPLOY_ORIGIN`, as `cf:deploy` builds); other builds render the card without asking | A refused cross-origin call is a console error, which would fail every check that visits `/app` locally |
| The card | Moved to the package (`showcase/status-card`, with `invalidateEverything` as `./invalidate`); the app passes the query, so the package still never depends on an app's contract | Both apps show the same card; its checks were already in the package |
| No status in the consumer's HTML | No loader; the browser asks after hydration (`serverRendered={false}`, its own note) | A prerendered page would bake a build-time status into a static file |
| An answer that breaks the contract | The card shows an error (`data-status="error"`), never the data; checked in both apps by mocking the answer | Item 5 for the status card; before, only the reservation had this check |
| Consumer checks | `statusCardChecks({ origin, registered })`: locally, no status in the HTML and nothing asked; against the deployed app (`project:test:remote`), the real cross-origin answer, its `Access-Control-Allow-Origin` and the broken-answer check | The cross-origin path can only be real on the registered origin |
| Contract package form | TypeScript source, like `@joeblew999/remy-ui`; no build step; peer `@joeblew999/remy-ui ^0.10.5` | Consumers' Vite and `tsc` take it as they take the UI package; checks never import it |
| Contract release | Same tag as the UI package, published only when its version is new (`npm view` first) | An unchanged contract must not fail the release |

Order for item 6: release remy-ui and the contract (`mise run ui:release`), deploy remy-auth (its
CORS must be live first), then in remy-auth-app merge `contract-status-card`, `npm install`,
`mise run project:upgrade-ui <version>`, deploy, and run `project:test:remote` there.

## Acceptance

- Changing a field in a contract fails the type-check in every consumer that uses it.
- A response that violates its schema is rejected on the client with a typed error.
- No endpoint exists without a contract, a policy and documented errors.

## Risks

1. oRPC 2.0 breaks the contract API and the wire format. We are on 1.15.4; migrate server and clients together when 2.0.0 is final. What the move touches here is listed in [oRPC 2.0 watch](#orpc-20-watch-2026-09-26) and tracked in #1.
2. oRPC rests mostly on one maintainer. Switch trigger: 2.0 stalls in beta through 2027, or
   maintenance stops; the runner-up is Hono with a small response-validation middleware.
3. oRPC's types need `skipLibCheck` (already on) or `@opentelemetry/api` installed.
4. Worker bundle size and parsing cost are not measured yet: spike item 1.
5. Kubb's TypeScript 7 fit is read from its package, not run: prove it before first use.

## oRPC 2.0 watch (2026-09-26)

Checked again on 2026-09-26 against [oRPC's v1 migration guide](https://orpc.dev/docs/migrations/from-v1)
(updated 2026-09-25). The decision stands: stay on 1.15.4.

**Why not yet.** 2.0 is still beta: v2.0.0-beta.40 on 2026-09-23, and beta.37 (2026-09-19) still
removed APIs (adapter interceptors and plugins, built-in RegExp). A beta would mean chasing breaking
changes weekly.

**Move when:** 2.0.0 ships without `-beta`, or we need something only 2.0 has.

**What 2.0 would give us.** One WebSocket adapter covering Cloudflare, and a WebSocket link that
reconnects by itself; `@orpc/cloudflare` (Durable Object publisher, Cloudflare rate limiter);
`@orpc/hibernation` as its own package; publisher, rate limit and Pino out of experimental; a batch
plugin that handles streams and files; Timeout and compression plugins; OpenAPI 3.2. None of this is
needed by the current contract (status and reservations); it matters once an app here holds a
socket or rate-limits.

**What the move touches in this repo** (found by reading the code on d14205f):

| Where | 1.15.4 | 2.0 |
| --- | --- | --- |
| `packages/contract/src/index.ts` | `.route({ method, path, summary, tags })` on both procedures | `.meta(openapi({ ... }))` from `@orpc/openapi`, or the `.route` extension import |
| `packages/contract/src/index.ts` | `INVALID_RESERVATION: { status: 400, ... }` | no `status` in errors; `errorStatusMap: { ...COMMON_ERROR_STATUS_MAP, INVALID_RESERVATION: 400 }` on the handler |
| `packages/ui/src/api/server.ts` | `CORSPlugin({ origin: [...origins] })` | `CORSHandlerPlugin`; keep the explicit origins (2.0 defaults to `*`, our wildcard guard stays) |
| `packages/ui/src/api/server.ts` | `OpenAPIReferencePlugin({ schemaConverters, specGenerateOptions: { info } })` | `OpenAPIReferenceHandlerPlugin({ provider, spec })`; generator takes `converters` and `base: { info }`; pass `version: '3.1.1'` to keep today's document, or accept 3.2 |
| `packages/ui/src/api/server.ts` | `@orpc/zod/zod4` | `@orpc/zod` (Zod 4 only) |
| `packages/ui/src/api/server.ts` | `missing.status` for the 404 answer | check whether `ORPCError` still carries `status` in 2.0; if not, use the status map |
| `packages/ui/src/api/client.ts` | `@orpc/openapi-client/fetch`, `OpenAPILink(contract, { url })` | `@orpc/openapi/fetch`, `{ origin, url }` with `url` a path |
| `packages/ui/src/api/client.ts` | `ResponseValidationPlugin` | `ResponseValidationLinkPlugin` (alias kept) |
| `src/router.tsx` | SSR hydration serializer | `RPCJsonSerializer` in place of `StandardRPCJsonSerializer` if we pass one |
| Wire format | v1 | v1 links cannot call a v2 server: release remy-auth, the contract and remy-auth-app together |

Not affected today: no middleware (2.0 drops automatic dedupe, so middleware on both router and
procedure runs twice; guard it when the relation engine becomes middleware), no GET on
`RPCHandler`, no `safe()`, no Durable Iterator, no WebSockets.

**Not adopted: `middleapi/standard-server`.** It is oRPC's request/response layer split into its
own packages (`@standard-server/fetch`, `peer` for WebSocket and MessagePort). oRPC uses it under
the hood; nothing here calls it directly. Revisit only if we build a transport oRPC does not cover.
2.0 adds a `Standard-Server` header on binary bodies: CORS must allow and expose it next to
`Content-Disposition` once we serve files cross-origin.

## Relation to other plans

Refined C's relation engine becomes oRPC middleware (remy-sport's `requireAction` already is),
so authorization and contracts share one place. The auth plan's own endpoints (registration,
check, provisioning) are contracts under this plan; Better Auth's endpoints stay Better Auth's.
