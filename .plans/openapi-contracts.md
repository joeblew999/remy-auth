# Contract-first APIs on TanStack: producing and consuming OpenAPI

Status: proposed 2026-09-25; implementation starts after the [TanStack plan](tanstack.md) lands on
main. Owner: remy-auth. The owner's blueprint was referenced but not received; this design states
its assumptions (marked "Assumed") so the blueprint can adjust them.

## Goal

Strict compile-time and runtime type safety, with backend and frontend kept synchronized through
OpenAPI, in two halves:

- **Producing:** every endpoint an app serves is defined first as a contract (method, path, input,
  output and errors as Zod schemas); the server implements the contract; the OpenAPI document is
  generated from the contract, never hand-written.
- **Consuming:** any API an app calls is reached through a typed client generated from, or checked
  against, that API's OpenAPI document, with responses validated at runtime.

## Decisions

| Decision | Choice | Why |
| --- | --- | --- |
| Producing | oRPC 1.15 contract-first (`@orpc/contract` `oc.route(...).input().output().errors()`, server via `implement(contract)`), Zod 4 schemas | remy-sport already produces its OpenAPI this way (generated from the router, committed snapshot, drift check, Scalar reference); it has a documented TanStack Start integration; one contract yields REST (OpenAPI) and a typed RPC client |
| Mounting | TanStack Start server routes: `src/routes/api/$.ts` with oRPC's `OpenAPIHandler` for REST, `src/routes/api/rpc.$.ts` with `RPCHandler` for the app's own fast path | Both from the same contract; Start owns routing and the Worker entry |
| Server functions | Kept only for page glue that is not an API (locale, device, place); anything another client could call is a contract endpoint | Server functions do not produce OpenAPI |
| SSR calls | In loaders on the server, a direct router client (`createRouterClient`) with the request's headers: no HTTP hop; in the browser, the RPC link | oRPC's documented isomorphic pattern (`createIsomorphicFn`) |
| TanStack Query | `@orpc/tanstack-query` `createTanstackQueryUtils(client)` for typed `queryOptions` and `mutationOptions`; loaders call `ensureQueryData` | One source of query keys, typed from the contract |
| Consuming another Remy app | Import its contract package when both sides are TypeScript: no generation, types are the contract | Nothing to drift |
| Consuming anything else (third-party, non-TypeScript, or across a published boundary) | `@hey-api/openapi-ts` 0.99 generating types, a fetch SDK and TanStack Query options from a pinned OpenAPI snapshot; runtime response validation with generated Zod schemas | Assumed: Hey API's Zod plugin and SDK validator option exist on the pinned version (its docs page moved); verify first, fall back to `openapi-typescript` plus hand-bound Zod parsing if not |
| Reference page | Scalar at `/api/doc`, the document at `/api/openapi.json` | As remy-sport |
| Where shared code lives | `@joeblew999/remy-ui/api`: Start server-route handlers, the isomorphic client factory, the generator, drift and coverage checks; each app keeps its contract and implementation | Same split as refined C: shared mechanism, app-owned content |

## Type safety, layer by layer

1. **Compile time:** TypeScript strict plus `noUncheckedIndexedAccess`; types flow contract to
   handler to client to TanStack Query to components; search params typed with the router's
   Zod adapter; `tsc` in level 1.
2. **Runtime, server:** oRPC validates every input against the contract and returns a typed
   400 on failure; outputs are validated too (assumed: oRPC output validation is on; verify),
   so the server cannot send what the document does not promise.
3. **Runtime, client:** responses from other services are parsed with the contract's or the
   generated Zod schemas before use; a mismatch is a typed error, never silently wrong data.
4. **Document:** generated from the contract at build time, written to `openapi.json`, committed;
   a check fails when the committed document differs from the generated one (remy-sport's rule:
   generate from code, never fetch a deployment).
5. **Coverage:** a check walks the router and fails when any endpoint lacks a contract, an
   authorization policy (refined C's guard) or documented error cases.

## Work items, in order

1. **Spike (about 1 hour):** oRPC 1.15.4 with TanStack Start on Workers: both handlers as server
   routes, the direct router client in a loader, `createTanstackQueryUtils` with SSR dehydration,
   OpenAPI generation from a contract with `ZodToJsonSchemaConverter`, output validation;
   Hey API 0.99 generating TanStack Query options and Zod validators from that document, with a
   response that violates the schema rejected at runtime.
2. **Package `api` module:** handlers, client factory, generator, drift and coverage checks, Scalar
   page, shared `api:spec` and `api:client` tasks in `tasks/api.toml`.
3. **remy-auth produces:** the demo's reservation and the status card move from server functions
   to contract endpoints (`POST /api/reservations`, `GET /api/status`), with the relation guard
   where they need one; `openapi.json` committed; the reference page live.
4. **remy-auth-app consumes:** a typed client generated from remy-auth's committed `openapi.json`
   with Hey API, validating responses at runtime, used for the status card; CORS limited to its
   registered origin.
5. **Checks** in both apps: document drift, endpoint coverage, a schema-violating response
   rejected, invalid input returning the typed 400 in every locale.
6. **Ship** with both levels, a release and both deploys, as in the TanStack plan.

## Acceptance

- Changing a field in a contract fails the type-check in every consumer that uses it, and fails the
  drift check until `openapi.json` is regenerated and committed.
- A response that violates its schema is rejected on the client with a typed error.
- No endpoint exists without a contract, a policy and documented errors.

## Relation to other plans

Refined C's relation engine becomes oRPC middleware (remy-sport's `requireAction` already is), so
authorization and contracts share one place. The auth plan's endpoints (registration, check,
provisioning) are contracts under this plan; Better Auth's own endpoints stay Better Auth's.
