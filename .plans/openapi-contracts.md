# Contract-first APIs on TanStack: producing and consuming OpenAPI

Status: decided 2026-09-25 under the owner's delegation, from a scored survey with scratch proofs
(below). It builds on the [TanStack move](tanstack.md), on main since release 0.9.0. Owner:
remy-auth. Executor/Reviewer roles as in [plans and roles](../docs/development.md#plans-and-roles). Tools were chosen by
survey, as [how we work](../docs/how-we-work.md) requires.

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
| oRPC version | Chosen in the spike: 2.0 if it is released by then, or if its latest beta proves better with TanStack; otherwise 1.15.4, with a later move of server and clients together | 2.0 changes both the contract API and the wire format, so starting on 1.15 means writing contracts twice. Betas ship every few days alongside the 1.15 patches (beta.40 on 2026-09-23), with no published release date. The owner reports that 2.0 integrates much more with TanStack and is close to release; the spike checks what it adds |
| Mounting | A Start server route `src/routes/api/$.ts` with `OpenAPIHandler`; `RPCHandler` only if the app's own pages need it | Start owns routing and the Worker entry; the adapter documents this route |
| Server functions | Only for page glue that no other client calls (locale, device, place) | They produce no OpenAPI, validate input only and live under `/_serverFn/*`, not stable paths |
| Server-side calls | `createRouterClient` inside loaders, through `createIsomorphicFn`; the browser uses the link | No HTTP hop on the server; oRPC's documented pattern |
| TanStack Query | `createTanstackQueryUtils(client)` for `queryOptions` and `mutationOptions`; loaders call `ensureQueryData`; SSR hydration with oRPC's serializer in `setupRouterSsrQueryIntegration` | Query keys come from the contract |
| Consuming another Remy API | Import that app's published contract and call it through `OpenAPILink` with `ResponseValidationPlugin`; no code generation | Types are the contract itself, so nothing can drift; responses are still checked at runtime |
| Where a contract lives | A small package per producing app, `@joeblew999/<app>-contract`, holding only Zod schemas and the contract, released with the app | Consumers need the contract without the server |
| Consuming third-party APIs | Not built until an app needs one. Then Kubb 5, proved first; fallback @hey-api/openapi-ts 0.99.0 | Kubb and Hey API tie at 19 of 21; Kubb wins on semver releases, 6 open issues against 639, and bringing its own TypeScript 6. Hey API is proved, but crashes on our TypeScript 7 unless run from a separate folder with TypeScript 6.0.3, and has published no release since June |
| Reference page | oRPC's `OpenAPIReferencePlugin` at `/api/doc`; document at `/api/openapi.json` | As remy-sport, no extra package |
| No committed spec | The document is generated in-process from the contract | One home for the facts: the contract. remy-sport works this way too |
| Shared code | `@joeblew999/remy-ui/api`: server-route handler, isomorphic client factory, spec options, the coverage check | Shared mechanism, app-owned contracts, as in refined C |

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
   [how we work](../docs/how-we-work.md#multi-agent-work).

## Acceptance

- Changing a field in a contract fails the type-check in every consumer that uses it.
- A response that violates its schema is rejected on the client with a typed error.
- No endpoint exists without a contract, a policy and documented errors.

## Risks

1. oRPC 2.0 breaks the contract API and the wire format. If we start on a 2.0 beta, pin it exactly and move to 2.0.0 when released; if we start on 1.15, migrate server and clients together.
2. oRPC rests mostly on one maintainer. Switch trigger: 2.0 stalls in beta through 2027, or
   maintenance stops; the runner-up is Hono with a small response-validation middleware.
3. oRPC's types need `skipLibCheck` (already on) or `@opentelemetry/api` installed.
4. Worker bundle size and parsing cost are not measured yet: spike item 1.
5. Kubb's TypeScript 7 fit is read from its package, not run: prove it before first use.

## Relation to other plans

Refined C's relation engine becomes oRPC middleware (remy-sport's `requireAction` already is),
so authorization and contracts share one place. The auth plan's own endpoints (registration,
check, provisioning) are contracts under this plan; Better Auth's endpoints stay Better Auth's.
