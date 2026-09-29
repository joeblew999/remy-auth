# @joeblew999/remy-auth-contract

remy-auth's API contract: the oRPC routes under `/api` with Zod 4 schemas for input, output and
typed errors. remy-auth implements it; a client imports it and calls remy-auth through
`contractClient` from `@joeblew999/remy-ui/api/client`, which validates every response against
it. Why and how: [the contracts plan](../../.plans/openapi-contracts.md).

| Procedure | Route | Errors |
| --- | --- | --- |
| `status` | `GET /api/status` | none of its own |
| `reservations.create` | `POST /api/reservations` | `INVALID_RESERVATION` (400, field errors in the asked language) |

The generated OpenAPI 3.1 document is served at `/api/openapi.json` and its reference at `/api/doc`.

## Calling it from another app

remy-auth-app shows remy-auth's status this way: `contractClient(contract, { url: remyAuthOrigin })`
and `createTanstackQueryUtils` from `@orpc/tanstack-query`, then the package's `StatusCard` with
`orpc.status.queryOptions()`. A browser may call the API only from an origin remy-auth registered
(`src/api/origins.ts`, CORS through `apiHandlers`' `origins`); ask for yours to be added there.

## Releases

Published to GitHub Packages (`publishConfig`) by `packages:publish` (in `packages:release`, and the tag's CI
job) under the shared package's tag, whenever this version is not published yet: bump `version` here when the
contract changes (`packages:bumped` fails the release otherwise). A field changed or removed is a breaking change for every
consumer: a new major (a new minor while 0.x).

It ships TypeScript source, as `@joeblew999/remy-ui` does: consumers' Vite bundles it and their
`tsc` checks it. A Playwright spec in a consumer must not import it (Playwright does not transpile
TypeScript inside `node_modules`); the shared checks take plain values instead. The peer ranges name
what it imports: the reservation shapes from `@joeblew999/remy-showcase` (0.1.0 on) and the API's
coverage types from `@joeblew999/remy-ui` (0.12.0 on). 0.2.1 imports them from `@joeblew999/remy-ui/reservation`, which 0.14.0
removed: it needs `@joeblew999/remy-ui` below 0.14.
