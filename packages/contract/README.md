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

## Not published yet

The package is `private` until its first release (the plan's work item 3). To publish it:

1. Release `@joeblew999/remy-ui` first: the contract imports its reservation schemas, so raise the
   peer range here to that release.
2. Ship JavaScript: add a `build` step (`tsc` to `dist/` with declarations), point `exports` at
   `dist/index.js` with `types`, and list `dist` in `files`. Consumers' bundlers and Playwright do
   not transpile TypeScript inside `node_modules`.
3. Remove `private`, then publish from `scripts/release.sh` beside the shared package, to GitHub
   Packages (`publishConfig`), with the same tag.
