# @joeblew999/remy-auth-contract

remy-auth's API contract: the oRPC routes under `/api` with Zod 4 schemas for input, output and
typed errors. remy-auth implements it; a client imports it and calls remy-auth through
`contractClient` from `@joeblew999/remy-ui/api/client`, which validates every response against
it. Why and how: [the contracts plan](../../.plans/openapi-contracts.md).

| Procedure | Route | Who may call it | Errors |
| --- | --- | --- | --- |
| `status` | `GET /api/status` | anyone (`public`) | none of its own |
| `me` | `GET /api/me` | a signed-in person (`session`): their own account | `UNAUTHORIZED` (401, nobody is signed in) |
| `reservations.create` | `POST /api/reservations` | anyone (`public`) | `INVALID_RESERVATION` (400, field errors in the asked language) |

Each procedure declares who may call it (`policy(...)` from `@joeblew999/remy-ui/api/policy`), and
remy-auth's router enforces it with the platform's guard (`@joeblew999/remy-ui/api/guard`). Routes are
oRPC 2's `openapi()` metadata. oRPC 2 keeps HTTP statuses out of the errors: `errorStatuses` gives this
API's own codes theirs, for the server and the generated document, and an error's body is
`{ defined, code, message, data }`, with the status on the response. `me` needs the session cookie remy-auth sets at
sign-in, which a browser sends only on remy-auth's own origin: a page on another origin gets 401.

The generated OpenAPI 3.1 document is served at `/api/openapi.json` and its reference at `/api/doc`.

## Calling it from another app

remy-auth-app shows remy-auth's status this way: `contractClient(contract, { origin: remyAuthOrigin })`
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
what it imports: the reservation shapes from `@joeblew999/remy-showcase` (0.1.0 on) and, from
`@joeblew999/remy-ui`, the API's policy metadata (`api/policy`, new with contract 0.4.0; `ui:version`
moves the floor to the release that first has it) and before that its coverage types (0.12.0 on).
0.4.0 is written for oRPC 2 (2.0.0-beta.42): a client still on oRPC 1 reads its successful answers
(checked by hand with 1.15.4's OpenAPILink), but sees a typed error as a plain 400. 0.2.1 imports them from `@joeblew999/remy-ui/reservation`, which 0.14.0
removed: it needs `@joeblew999/remy-ui` below 0.14.
