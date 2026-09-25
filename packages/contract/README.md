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

Published to GitHub Packages (`publishConfig`) by `scripts/release.sh` (and the tag's CI job) under
the shared package's tag, whenever this version is not published yet: bump `version` here, and the
root's pin, when the contract changes. A field changed or removed is a breaking change for every
consumer: a new major (a new minor while 0.x).

It ships TypeScript source, as `@joeblew999/remy-ui` does: consumers' Vite bundles it and their
`tsc` checks it. A Playwright spec in a consumer must not import it (Playwright does not transpile
TypeScript inside `node_modules`); the shared checks take plain values instead. The peer range names
the first `@joeblew999/remy-ui` with the reservation shapes it imports (0.10.5).
