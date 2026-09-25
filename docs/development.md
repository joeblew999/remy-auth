# Architecture and development principles

This service owns login, users, sessions, organizations, memberships, application
registrations and token issuance. Each application owns its business records,
resource permissions and enforcement beside its API contract. HTTP and MCP entry
points must enforce the same application permissions.

The first consumer will be a runnable sample app in `examples/sample-app/`, with
a browser UI, protected HTTP API and MCP access. The auth service and sample run
locally from this repository so the full flow can be verified before app migration.

[Remy Data](https://github.com/joeblew999/remy-data) is the first external consumer. Its
[integration plan](https://github.com/joeblew999/remy-data/blob/main/.plans/auth.md)
tracks adoption there.
Tests run a second isolated instance of the sample to verify application isolation.
The sample is planned; its code and startup command do not exist yet.

## Development principles

- Prefer maintained upstream tools, official integrations and existing libraries.
  Check what already exists before writing custom code. Keep wrappers thin; add
  custom behavior only for a concrete unmet requirement and document the gap.
- Keep behaviour local to its owner and visible at the entry point.
- Use mise to pin tools and run project commands. Do not import the retired
  `joeblew999/.github` task library or control other repos through shared scripts.
  Name every task `namespace:action`; keep aliases namespaced too.
- Development uses local storage. Startup must not provision production identities,
  import sample data or silently change app registrations.
- Keep one Worker implementation and one source Wrangler configuration for local
  and deployed execution. Test the production artifact locally and reuse the same
  acceptance suite against deployed URLs. Environment differences belong in
  bindings and secrets, not duplicate code. See [the runtime workflow](gui.md).
- Apps integrate through a versioned protocol/contract, never direct access to this
  service's database. App data and auth provisioning are separate operations.
- Failures remain visible. Never grant access because auth is unavailable.
- Keep credentials out of code, plans, logs and commits.
- Give each fact one home. Link to the owning document, config or generated source
  instead of restating it; change the owner, then update links.
- Tests and audits are acceptance gates. Never skip, exempt, loosen or delete a check,
  including individual Lighthouse audits, to make a run pass. Fix the cause, or stop
  and ask the owner.
- Change generated code at its source: shadcn components and theme tokens through
  shadcn, translations in `packages/ui/messages/`, and Wrangler/TanStack Router output
  (including `src/routeTree.gen.ts`) by regenerating. Do not hand-edit or override generated output elsewhere.
- Decisions that plans leave open, or fixes that conflict with a plan, belong to the
  owner. Ask; do not choose. Deploying, provisioning and filing upstream issues
  also wait for the owner's explicit request.
- Do not mock Better Auth, D1 or the Workers runtime. Development conveniences (a seed route,
  a sign-in picker for seeded people, a fixed sign-in code) are allowed only behind one
  per-environment policy table whose default, and whose value for any unknown environment, is
  production with everything off; they never create sessions outside Better Auth, never exist
  in production, require authentication outside local development, and are listed in the
  owning plan. No other test-only routes, flags or bypasses.

Cloudflare storage is the chosen direction, with D1 as the planned identity and
session database. Verify the required Better Auth plugins against the pinned D1
adapter before implementation acceptance. SCIM is deferred until directory
provisioning is needed; PostgreSQL/Hyperdrive is not part of the current plan.
No community ReBAC plugin has been selected.

For developers and agents: read [the implementation plan](../.plans/auth-service.md) before implementation. Use the roles
Executor and Reviewer; keep plans in `.plans/` and move them to `.plans/done/`
only after implementation, required checks and reviewer acceptance. This repository
creation authorizes the planning scaffold, not production provisioning or rollout.
