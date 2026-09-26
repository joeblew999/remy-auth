---
title: "Architecture and development principles"
description: "What the code must be: ownership, a single source of truth, test gates, generated code and owner decisions."
---

This document owns what the code must be. How people and agents work day to day lives in
[how we work](./how-we-work.md). What the auth service owns, and its storage direction, live in
[the auth service plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/parked/auth-service.md).

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
  bindings and secrets, not duplicate code. See [the runtime workflow](./gui.md).
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
  owner. Ask; do not choose, unless the owner has delegated them
  ([how we work](./how-we-work.md#when-the-owner-delegates-decisions)). Deploying, provisioning and filing upstream issues
  also wait for the owner's explicit request.
- Do not mock Better Auth, D1 or the Workers runtime. Development conveniences (a seed route,
  a sign-in picker for seeded people, a fixed sign-in code) are allowed only behind one
  per-environment policy table whose default, and whose value for any unknown environment, is
  production with everything off; they never create sessions outside Better Auth, never exist
  in production, require authentication outside local development, and are listed in the
  owning plan. No other test-only routes, flags or bypasses.

## Plans and roles

Plans live in `.plans/`; [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md) is the one list of what is open and
where it stands. Read the plan covering your task before changing anything. Every plan works with two roles: the Reviewer
defines acceptance, and the Executor implements and verifies a bounded milestone, then reports the
exact checks run, the files changed and the limitations. A plan moves to `.plans/done/` only after
implementation, its required checks and the Reviewer's acceptance.
