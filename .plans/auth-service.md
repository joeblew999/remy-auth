# Shared auth service

Status: proposed, 2026-09-24. Repository scaffold only; implementation has not started.
Owner: remy-auth. First consumer: in-repo sample; first external consumer: remy-data.
Reviewer defines acceptance;
Executor implements and verifies a bounded milestone. Do not begin a fleet rollout.

## Problem and outcome

Applications currently implement their own access mechanisms. Remy Data uses an
operator key for production mutations and public reads. We want one login and
identity service for Cloudflare applications, with consistent HTTP/MCP access
control and explicit per-app, per-organization permissions.

Build an independently deployed Better Auth Worker and prove two independent
consumers can use it without sharing application databases or granting each other
access accidentally. A shared login must not imply access to every application.

## Ownership and locality of behaviour

| Owner | Responsibility |
| --- | --- |
| remy-auth | Login UI, identities, credentials, sessions, organizations/memberships, registered clients, consent, tokens/signing keys and auth migrations |
| Each app | Business records, resource ownership/relationships, permission declarations and enforcement beside its API contract |
| Consumer integration contract | Issuer/discovery, audiences, scopes, verified subject/organization identity, key rotation, error behaviour and versioning |

HTTP and MCP adapters must call the same protected application operations. App
permission definitions are not duplicated in a second MCP-only policy table.
Only remy-auth writes its identity database. Apps use supported service interfaces.
Do not route every business operation through the auth Worker or put app data in it.

## Required decisions before implementation

Storage direction: Cloudflare-native storage, starting with D1 for identity and
sessions, and separate local D1 storage for the sample's business records. SCIM is
deferred until a concrete directory-provisioning requirement exists. PostgreSQL
and Hyperdrive are outside the current scope. Add KV, R2 or Durable Objects only
for an identified requirement; the initial auth design does not depend on them.

The [ecosystem inventory](better-auth-ecosystem.md) records researched CLI, plugin,
GUI and agent-tooling options, with a proposed feature adoption matrix. Its
recommendations still require pinned-version runtime verification.

1. Select the first login method and organization/membership model. Define how the
   first owner is explicitly provisioned; no default production admin or password.
2. Record a feature matrix: organization RBAC, passkeys, MFA, SSO, SCIM, API/service
   accounts, CLI login and user-delegated agent access. Mark each required now,
   later, or excluded, with runtime/database compatibility evidence. The broader
   goal is shared access to Better Auth capabilities, not enabling every plugin blindly.
3. Pin compatible Better Auth, OAuth/MCP and adapter versions. Prove Worker runtime
   support for the selected combination, including required transactions and
   discovery/client-metadata transport. D1 is the planned store; acceptance requires
   those checks to pass. Report incompatibilities rather than silently switching stores.
4. Define local ports, issuer/origins, exact callback allowlists, token audiences
   and allowed grant types for the sample app and its second isolated test instance.
5. Define token lifetime, maximum revocation delay, permission-check caching,
   signing-key rotation and the failure behaviour when auth is unavailable.
6. Write concrete resource-sharing examples before deciding whether ReBAC is needed.
   Start with Better Auth organization roles where they express the requirements.

Escalate any required feature incompatible with the chosen database/runtime,
identity/tenant ambiguity, or need to change another repo's existing public access.
Do not silently drop a required feature or substitute a new store.

## Evidence already checked (2026-09-24)

- [Organization access control](https://better-auth.com/docs/plugins/organization#access-control)
  supports custom roles and permissions; RBAC and ReBAC are different requirements.
- [SCIM requirements](https://better-auth.com/docs/plugins/scim#enable-database-transactions)
  explicitly exclude D1's transaction capabilities. SCIM is deferred and does not
  drive the current storage choice. Revisit compatibility if it becomes required.
- [MCP integration](https://better-auth.com/docs/plugins/mcp) requires resource-server
  validation and enforcement. Issuing a token does not protect a separate app.
- The [community Zanzibar plugin](https://github.com/DagNo1/better-auth-zanzibar-plugin)
  supplies permission-check endpoints and application-defined policy callbacks.
  It does not supply the tuple database or automatically protect app routes claimed
  in the original proposal. Its optional five-minute cache needs revocation analysis.
  It is a research candidate only, not an implementation dependency.

Recheck primary documentation against the pinned versions during implementation.
Do not treat these observations as a deployed-system compatibility test.

## Milestone 1: service plus runnable in-repo sample

Executor-owned areas in this repo: tool/dependency pins, Worker entry, auth config,
login/consent UI, identity schema and numbered migrations, registration interface,
versioned consumer contract, `examples/sample-app/`, local startup and integration
tests. Exact service file layout
is chosen during scaffolding; keep configuration beside the behaviour it controls.
This milestone must run and pass entirely inside remy-auth without a Remy Data
checkout. Remy Data integration follows afterward under its own plan and instructions.

1. Implement the chosen minimal identity/organization feature set and issuer.
2. Expose the standard discovery and key endpoints; support the selected HTTP/MCP
   authorization flows. Browser/CLI user delegation and machine credentials must
   remain distinct identities with explicit privileges.
3. Build the sample described below. Register it and a second isolated instance
   with distinct audiences and exact callback URLs. Protect one read and one
   mutation through the sample contract; test that neither instance accepts the
   other instance's tokens or accesses its data.
4. Verify signature, issuer, intended audience, expiry and required scope at each
   protected boundary. Derive the acting user/organization from trusted identity
   and membership checks, not a caller-supplied user ID or organization header.
5. Apply resource permissions server-side before side effects; browser checks are
   only presentation. Keep permission enforcement visible beside the operation.
6. Provide local execution for service and consumers with isolated local storage.
   Starting dev applies local schema and starts processes; accounts/registrations
   are provisioned explicitly. It never provisions or queries production implicitly.

## Sample app: `examples/sample-app/`

Build a small real consumer with a browser UI and its own Worker and local business
storage. Use organization-owned notes as the minimal domain: sign in, show the
current user/organization, list notes, create a note, and sign out. A reader can list;
an editor can create. Display access failures clearly. Keep the sample's registration,
permission declarations, API contract, HTTP/MCP adapters and tests in its directory.
It must use the public auth integration contract, never service internals or direct
identity-database access. Its notes remain separate from auth storage.

Expose the same list/create operations through HTTP and MCP with one server-side
permission decision. Exercise browser login, CLI/user delegation and the selected
machine-access flow against this consumer. The sample is the working reference
for future apps, not a mock or an alternate auth implementation.

Provide one root `mise run project:dev` command that starts the local auth service and sample,
reports both URLs and local data targets, and stops both on exit. A fresh checkout
must work without another repo, production credentials, external source data or
pre-existing accounts. Provide an explicit local setup/provisioning command for app
registration and initial access; startup must not silently seed users or notes.
Users create notes through the UI; automated tests provision disposable local data.

Run a second isolated sample instance in integration tests with its own registration,
audience and storage. This proves cross-app rejection and shared login without
maintaining a second example codebase. Local browser and HTTP/MCP tests must cover
allowed and denied operations, organization isolation, logout and revocation before
Remy Data adoption starts.

## Provisioning and seed data

Each app owns a declarative registration definition containing a stable app ID,
allowed callbacks, audience and permissions. The service owns the validated,
authorized registration interface. Version the format and validate changes.
Provisioning is explicit, environment-specific and idempotent: repeating it creates
no duplicate users, memberships or clients and does not overwrite operator changes
silently. Privilege grants require an authorized actor and audit evidence.

Application seed records stay in their app database and use stable references to
auth identities only when required. They are not copied into the identity service.
Tests can create deterministic disposable local identities; normal dev startup is
not a seed/provisioning command. No bootstrap credentials committed in manifests.

## Definition of done

Cloudflare-native observability is required. Implement and verify the
[observability plan](observability.md), including structured redacted logs,
correlated traces, platform/D1 metrics, durable security audit records, dashboards
and tested alert/recovery delivery. Collection configuration alone is not completion.

- The sample and its isolated second instance complete login against the same issuer; successful authorized
  HTTP and MCP operations exercise the same application permission decision.
- Missing, expired, forged, wrong-issuer and wrong-audience tokens produce 401
  at protected APIs (and the applicable OAuth/MCP challenge), with zero writes.
- Valid identity without required scope/membership/resource permission produces
  403 with zero writes. Tenant A cannot read or mutate tenant B's protected data;
  lists/searches do not leak inaccessible records. App A tokens are rejected by B.
- Disallowed callbacks and replayed authorization codes fail. Client secrets and
  service-account credentials are not exposed to browsers or public clients.
- Membership removal, logout/revocation and signing-key rotation obey the recorded
  lifetime/revocation contract across multiple Worker instances. Cache behaviour
  is tested; process-local cache success is not proof of distributed correctness.
- Auth outage or unknown signing key never grants access. Unavailable required
  authorization checks return a defined service-unavailable result, not success.
- Repeated explicit provisioning is idempotent; local operations cannot mutate
  production registrations/users. No test contacts production or sends real mail.
- Verification covers the actual Worker runtime, database migrations, browser flow,
  two-consumer integration and HTTP/MCP parity. No permissive mocks or any-error assertions.

Define service verification/development commands in mise.toml during implementation.
Developer CLI setup, version diagnostics, Better Auth/Wrangler passthrough and
agent-skill installation/listing tasks exist; no service startup or migration tasks
exist yet. Do not add duplicate shell frameworks or a fleet task library. CI must be
manual-only unless the owner explicitly changes that policy. Executor reports exact
checks, changed files and limitations; Reviewer accepts the completed milestone.

## Boundaries and rollout

No fleet migration, automatic data seeding, implicit ReBAC adoption, or commitment
to every plugin in this first milestone. Preserve each consumer's existing access
until its cutover is reviewed. Do not retain an undocumented operator-key bypass.

Production resources, domains, secrets and deployment are a later explicit action.
Before production cutover: review migration/rollback, verify local acceptance, then
verify fresh production auth logs and end-to-end behaviour after deployment. Repo
creation and these documents do not authorize production provisioning.
