# Remy Auth

Shared identity and authentication service for Remy applications, built around
Better Auth and deployed independently on Cloudflare Workers.

**Status: planning only.** No application, database, deployment or runnable mise
tasks exist yet. Start with [the implementation plan](.plans/auth-service.md).

## Ownership

This service owns login, users, sessions, organizations, memberships, application
registrations and token issuance. Each application owns its business records,
resource permissions and enforcement beside its API contract. HTTP and MCP entry
points must enforce the same application permissions.

[Remy Data](https://github.com/joeblew999/remy-data) is the first consumer. Its
[integration plan](https://github.com/joeblew999/remy-data/blob/main/.plans/auth.md)
tracks adoption there; that link becomes available once the local plan is pushed.
The first service milestone must also demonstrate a second independent consumer.

## Development principles

- Keep behaviour local to its owner and visible at the entry point.
- Use mise to pin tools and run project commands. Do not import the retired
  `joeblew999/.github` task library or control other repos through shared scripts.
- Development uses local storage. Startup must not provision production identities,
  import sample data or silently change app registrations.
- Apps integrate through a versioned protocol/contract, never direct access to this
  service's database. App data and auth provisioning are separate operations.
- Failures remain visible. Never grant access because auth is unavailable.
- Keep credentials out of code, plans, logs and commits.

Better Auth features will be selected and verified individually. D1 is a candidate,
not a promise that every plugin works: SCIM currently requires database capabilities
D1 does not provide. No community ReBAC plugin has been selected.

For developers and agents: read the plan before implementation. Use the roles
Executor and Reviewer; keep plans in `.plans/` and move them to `.plans/done/`
only after implementation, required checks and reviewer acceptance. This repository
creation authorizes the planning scaffold, not production provisioning or rollout.
