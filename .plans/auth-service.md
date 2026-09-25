# Shared auth service

Status: proposed, 2026-09-24; refreshed 2026-09-25 for TanStack Start. Minimal GUI proof implemented; auth service implementation has not started. Builds on the [TanStack move](done/tanstack.md), on main since release 0.9.0.
Owner: remy-auth. First consumer: in-repo sample; first external consumer: remy-data.
Executor/Reviewer roles as in [plans and roles](../docs/development.md#plans-and-roles). Do not
begin a fleet rollout.

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

## GUI and reusable packages

The [done GUI plan](done/gui.md) and the [portal plan](gui-portal.md) cover shared shadcn/Base UI components, Paraglide,
public-page rendering and SEO, plus same-tab hosted authentication. SSR is not
required for every screen or consuming application. Both the service GUI
and consuming apps must exercise these packages through their public exports.
The initial smoke test is a small vertical slice, not completion of the full
consumer/authorization milestone below.

## Required decisions before implementation

Storage direction: Cloudflare-native storage, starting with D1 for identity and
sessions, and separate local D1 storage for the sample's business records. SCIM is
deferred until a concrete directory-provisioning requirement exists. PostgreSQL
and Hyperdrive are outside the current scope. Add KV, R2 or Durable Objects only
for an identified requirement; the initial auth design does not depend on them.

The [ecosystem inventory](better-auth-ecosystem.md) records researched CLI, plugin,
GUI and agent-tooling options, with a proposed feature adoption matrix. Its
recommendations still require pinned-version runtime verification.

Items 1, 2, 4 and 5 have [proposals awaiting owner confirmation](#proposed-decisions-1-2-4-and-5).

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
5. Define token lifetime, maximum revocation delay, permission-check caching (see the runtime
   architecture below),
   signing-key rotation and the failure behaviour when auth is unavailable.
6. Write concrete resource-sharing examples before deciding whether ReBAC is needed.
   Start with Better Auth organization roles where they express the requirements.

Escalate any required feature incompatible with the chosen database/runtime,
identity/tenant ambiguity, or need to change another repo's existing public access.
Do not silently drop a required feature or substitute a new store.

## Proposed decisions 1, 2, 4 and 5

Proposed 2026-09-25, awaiting owner confirmation. Drafted from the
[ecosystem inventory](better-auth-ecosystem.md), the installed Better Auth skills
(`better-auth-best-practices`, `better-auth-security-best-practices`, `organization-best-practices`,
`two-factor-authentication-best-practices`), the runtime architecture below, and Better Auth's
documentation read on 2026-09-25:
[OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider),
[JWT](https://better-auth.com/docs/plugins/jwt),
[Email OTP](https://better-auth.com/docs/plugins/email-otp),
[Admin](https://better-auth.com/docs/plugins/admin),
[Passkey](https://better-auth.com/docs/plugins/passkey) and the
[CLI](https://better-auth.com/docs/concepts/cli). Nothing here has run on pinned versions:
"documented" below means documented upstream, and the decision 3 spike must confirm it on
Workers and D1. Once confirmed, each value moves to its home (the auth configuration, the
sample's registration definition, `mise.toml` for ports) and this section links there instead.

### 1. First login method, organization model, first owner

**Login method.** Options: email and password; email one-time code (`emailOTP`); magic link;
passkey first; a social provider.

Recommended: **email one-time code**, with `storeOTP: "hashed"` (the default is plain) and the
documented defaults otherwise (6 digits, 300 seconds, 3 attempts). Email and password stays off.

- No password is stored, reset or leaked, which removes the reset and breach-check flows.
- The code proves the address, so every account has a verified email by construction.
- The plan's seeded sign-in picker already requires "a real Better Auth code sign-in"; one
  method then serves people, tests and local development, gated by the environment policy.
- Password hashing (scrypt by default) is CPU-heavy for Workers; avoiding it removes a runtime
  risk (assumed, not measured).
- Cost: it needs mail delivery. Deployed: Cloudflare Email Service (installed skill
  `cloudflare-email-service`). Local and tests: codes are captured locally and no real mail is
  sent, as the definition of done requires. A delivery failure is shown as an error, never
  replaced by a fallback code.
- Runner-up: email and password. It needs mail for recovery anyway, so it removes no dependency.

Sign-up: **open, but a new account holds nothing.** It has no organization, no platform role and
no app grant, so a shared login never implies access to any app. Better Auth rate limits (stored
in D1) apply from the start; Turnstile or a captcha is production hardening.

**Organization model.** Options: no organizations (users plus per-app grants); Better Auth's
`organization` plugin with one organization per tenant; a personal organization per user.

Recommended: **the `organization` plugin, one organization per tenant, no teams yet, no
personal organizations.** `allowUserToCreateOrganization` is limited to platform admins at first.
Membership roles are Better Auth's `owner`, `admin` and `member`, and they govern the
organization's own administration only. App permissions stay in the app, as the runtime
architecture decided: the sample's `reader` and `editor` are relations in the sample's own data,
where `reader` comes from any membership and `editor` from the `owner` or `admin` role or an
explicit app grant, through the relation engine's role kind. The token carries the active
organization and the member's role in it.

**First owner.** Options: `auth create-admin` (prompts for a password when `--password` is
omitted, and runs in Node against a database connection, which a D1 binding is not; both
unverified for our setup); a direct D1 write (bypasses hooks and audit, which the ecosystem
inventory forbids); Better Auth's `adminUserIds` option, set per environment.

Recommended: **`adminUserIds` from a per-environment Worker variable.**

- Deployed: the owner signs in with a code, which creates an ordinary empty account; an explicit,
  environment-specific task puts that user ID in the environment's variable, and a deploy makes
  it an admin. There is no default admin and no password at any step, and the account has no
  privilege before that deploy.
- Local: the seed definition's owner identity has a fixed ID, and the local variable names it.
- The first admin then creates the first organization (becoming its `owner`) and grants further
  admins through the Admin API, which is audited.

What would change it: `create-admin` gaining a passwordless mode that works against D1, or the
owner wanting several bootstrap operators without a deploy. The login method would change for
users without reliable email, or for a customer requiring its own identity provider (SSO).

### 2. Feature matrix

Evidence levels: **documented** (Better Auth or Cloudflare documentation says so), **assumed**
(not yet shown on Workers and D1) and **excluded by documentation**. Better Auth documents
[native D1 support](https://better-auth.com/blog/1-5); D1 has no interactive transactions, only
atomic batches, so any plugin step that relies on a transaction is assumed non-atomic until the
spike proves otherwise.

| Feature | Stage | Runtime and D1 evidence | Reason |
| --- | --- | --- | --- |
| Email one-time code | Now | Documented plugin, using the verification table; delivery through Cloudflare Email Service documented; Workers run assumed | Decision 1 |
| Organization RBAC (`organization`) | Now | Documented tables for organizations, members and invitations; creating an organization and its owner is several writes, atomicity on D1 assumed | The sample's notes are organization-owned; roles cover organization administration |
| Platform roles (`admin`) | Now | Documented; adds fields to the user table | First owner and operator actions |
| JWT and JWKS (`jwt`) | Now | Documented: EdDSA (Ed25519), keys in a D1 table, private keys encrypted with AES-256-GCM; Web Crypto on Workers assumed | Apps verify tokens locally |
| CLI login | Now | Documented: authorization code with S256 PKCE for public clients (`token_endpoint_auth_method: "none"`) | Required by milestone 1 |
| User-delegated agent access (MCP) | Now, explicitly registered clients only | Documented `@better-auth/mcp`, which configures the OAuth provider itself; client metadata discovery (CIMD) needs a Worker-safe fetch transport, assumed missing | Required by milestone 1; discovery waits for that transport |
| Service accounts | Now, as OAuth `client_credentials` | Documented fail-closed grant: an admin must set `client_credentials_scopes` | The milestone's machine-access flow; a machine never inherits a person's rights |
| API keys (`apiKey`) | Later, when a consumer needs one | Documented; storage and rate-limit behaviour on D1 assumed | Duplicates `client_credentials` until a consumer cannot use OAuth |
| Device authorization | Later, CLI follow-up | Documented `device_code` grant | Headless terminals; needs an approval screen |
| Passkeys (`@better-auth/passkey`) | Later, before production sign-off | Documented single table; the relying party ID is bound to a domain; the WebAuthn library on Workers assumed | Passkeys enrolled on a temporary host are lost when the production domain changes, so enrol only once it is chosen |
| MFA (`twoFactor`, TOTP and backup codes) | Later, with passkeys | Documented table; an email second factor adds nothing to an email first factor | Step-up rules belong to the production policy |
| SSO (`@better-auth/sso`, OIDC and SAML) | Later, on a customer's request | SAML's XML dependencies on Workers assumed, not shown | No customer needs it yet |
| SCIM | Excluded | Excluded by documentation: it [requires interactive transactions and excludes D1](https://better-auth.com/docs/plugins/scim#enable-database-transactions) | Revisit only with a directory-provisioning requirement |
| Agent Auth | Later, separate evaluation | Not assessed | MCP delegation covers the sample |
| Social login, magic link | Later, on demand | Provider secrets or mail | Not needed for the sample |

What would change it: a customer asking for SSO or directory provisioning (SCIM would also
reopen the storage decision), a consumer that cannot use OAuth (API keys), or the spike showing
that a "now" plugin fails on Workers or D1, which is escalated, not dropped.

### 4. Local ports, issuer, origins, callbacks, audiences, grants

Cookies ignore ports, so two apps on `localhost` share one cookie jar. Recommended: remy-auth
stays on `localhost`, and each sample instance gets its own `*.localhost` host name, so host-only
cookies stay apart as they will in production. Chrome resolves `*.localhost` to loopback, and
Node 26 was checked here to do so too (`sample-a.localhost` resolved to `::1`); whether
Wrangler's local server answers on `::1` is assumed until the spike. Runner-up: plain
`localhost` with a distinct cookie prefix per app, if `*.localhost` fails in the spike.

| Service | Dev (`project:dev`) | Test and preview | Port home |
| --- | --- | --- | --- |
| remy-auth (issuer) | `http://localhost:5173` | `http://localhost:${PREVIEW_PORT}` (4173) | `mise.toml` |
| Sample A | `http://sample-a.localhost:5183` | `http://sample-a.localhost:${SAMPLE_A_PORT}` (4183) | `mise.toml`, set from the shell like `PREVIEW_PORT` |
| Sample B (tests only) | none | `http://sample-b.localhost:${SAMPLE_B_PORT}` (4184) | as above |
| CLI loopback | `http://127.0.0.1:4199/callback` | the same | the CLI |

- **Issuer:** exactly Better Auth's `baseURL` for the environment, as its discovery document
  publishes it; consumers compare `iss` for equality. Deployed, that is `DEPLOY_ORIGIN` in
  `mise.toml` for now; the production issuer waits for the production domain.
- **Trusted origins:** remy-auth's `trustedOrigins` lists exactly that environment's sample
  origins, with no wildcard.
- **Callbacks,** exact strings, no wildcards, no trailing-slash variants: sample A
  `<origin>/auth/callback` for each of its origins above, sample B likewise, and the CLI
  `http://127.0.0.1:4199/callback`. If the spike shows Better Auth matches loopback redirects
  regardless of port (RFC 8252, section 7.3), the CLI registers `http://127.0.0.1/callback` and
  picks a free port instead. Post-logout redirects: each sample origin with path `/`.
- **Audiences** (the OAuth Provider's `resources`, each becoming `aud`): per sample instance,
  its origin for the HTTP API and `<origin>/mcp` for its MCP server, since MCP requires the
  server's own URI. Scopes: `notes:read` and `notes:write`, plus `openid profile email
  offline_access` for sign-in. A token for A names only A's audiences, so B refuses it.

| Client | Type | Grants | Notes |
| --- | --- | --- | --- |
| `sample-a-web`, `sample-b-web` | Confidential (`client_secret_basic`, secret in a Worker secret) | `authorization_code` with S256 PKCE, `refresh_token` | Operator-registered first party; consent skipped (`skip_consent`) |
| `remy-cli` | Public (`none`) | `authorization_code` with S256 PKCE, `refresh_token` | Resources A and B, one per login; consent shown |
| `sample-mcp-test` | Public (`none`) | `authorization_code` with S256 PKCE, `refresh_token` | Consent shown; stands in for an agent |
| `sample-a-machine` | Confidential | `client_credentials` only | `client_credentials_scopes` is `notes:read`; audience A only |

No implicit or password grant (OAuth 2.1 has neither); `device_code` stays off until device
authorization is adopted. What would change it: `*.localhost` failing in the spike, a port clash
on CI, or the choice of the production domain.

### 5. Lifetimes, revocation, caching, key rotation, failures

| Setting | Proposed | Better Auth default | Reason |
| --- | --- | --- | --- |
| remy-auth session (`expiresIn`, `updateAge`) | 7 days, refreshed daily | the same | Sign in once a week at most |
| Session cookie cache (`cookieCache`) | Off | off | A cache keeps a revoked session alive for its age |
| Access token, people and machines (`accessTokenExpiresIn`, `m2mAccessTokenExpiresIn`) | 5 minutes | 1 hour | JWT access tokens cannot be revoked server-side, so their lifetime is the revocation delay |
| Refresh token | 30 days, rotated, reuse refused (`refreshTokenReuseInterval: 0`) | the same | Revoking it stops new access tokens |
| ID token | 10 hours, never accepted as an access token (its `aud` is the client) | the same | Sign-in only |
| Authorization code | 10 minutes, single use | the same | Replay fails |

**Maximum revocation delay: 5 minutes** for anything a token carries (logout, session
revocation, membership removal, platform-role change), and **none** for relationships, which each
app reads from its own tables on every request. If removing a member in Better Auth does not also
revoke that member's refresh tokens (assumed, to be tested), remy-auth does it in the same
operation.

**Permission-check caching:**

- Apps cache the JWKS per isolate for at most 10 minutes; an unknown key ID triggers one refetch,
  at most once every 30 seconds. Better Auth suggests caching keys indefinitely; the bound makes a
  removed, compromised key stop being trusted.
- Relationship checks and service-binding answers from remy-auth are not cached.
- Browser caches (TanStack Query and router loaders) go stale within the 5 minutes and are
  invalidated on logout and role change; they only shape the page, and the server checks again.
- Nothing auth-related goes in KV, which is eventually consistent.

**Signing-key rotation:** Ed25519, `rotationInterval` 30 days, `gracePeriod` 7 days (default
30), far longer than any token's life. Emergency rotation: rotate, remove the compromised key,
and every app stops trusting it within the 10-minute JWKS bound. Two Worker instances rotating at
once is a spike check.

**When auth is unavailable** (the rule: never grant access):

- A valid token with cached keys keeps working until it expires, at most 5 minutes.
- New sign-ins and refreshes fail, and the app says the sign-in service is unavailable.
- JWKS unreachable: cached keys are used for up to 1 hour, then 503 `auth_unavailable`.
- Unknown key ID: 401 `invalid_token` if the refetch succeeded, 503 if it failed.
- A required service-binding call failing or taking over 2 seconds, or the app's own D1 failing
  during a relationship check: 503, with zero writes.
- remy-auth's D1 or rate-limit storage failing: sign-in refused with 503, never allowed without
  limits.
- MCP returns the same outcomes, with its `WWW-Authenticate` challenge on 401.
- Public site pages do not depend on auth and stay up.

Runner-up: opaque access tokens with introspection (`disableJwtPlugin`) revoke instantly, but add
a remy-auth call to every request, which the runtime architecture rejected. What would change it:
an operation needing instant revocation (introspect for that operation, give its scope a shorter
`scopeExpirations` entry, or use back-channel logout, which needs the JWT plugin), or measured
refresh load on D1 at 5 minutes.

## Runtime architecture: identity central, relationships local (decided 2026-09-25, refined)

The owner chose "decide centrally, enforce locally", then refined it after the remy-sport survey:
relationships stay in each app's own data. remy-sport's working ReBAC (27 relations as data,
derived from its domain tables such as `team_coaches`, no tuple store) shows why: a central
relationship store would have to copy and re-sync every app's data. Rejected alternatives:
remy-auth as the one backend for every app (couples every app's data, deploys, outages and one
D1's size limit), and the shared package alone as the backend (leaves identity without a home).

| Lives in | What |
| --- | --- |
| remy-auth | Identities, sign-in, sessions, tokens and signing keys (JWKS), app registrations, platform roles (for example admin), organizations only where a registration asks for them, and the seeded identities with fixed IDs |
| The shared package | Session and token verification, and remy-sport's relation engine generalised: the relation model as data (`via` table, parent, role or everyone), set-based checks (`holds`, `heldAmong`, `objectsHeldBy`, `canFor`), the `requireAction` guard (404 before 403, fail closed) as TanStack function middleware, and the check that fails the build when any server function or route has no policy |
| Each app | Its own data in its own D1, its relation vocabulary and grants as data, enforcement beside each operation through the shared guard, and its own seed rows referring to remy-auth's seeded identity IDs |

The contract, versioned and owned by remy-auth:

- **Tokens:** short-lived signed tokens with issuer, audience (the app), subject and platform
  roles. Apps verify them locally with the cached JWKS, with no call per request; a failed or
  unknown key refuses.
- **Relationships** are answered inside the app from its own tables. Service-binding calls to
  remy-auth are only for questions remy-auth alone can answer (a platform role, a cross-app
  relation); unavailable means refused.
- **Lists** come back with a server-computed permission map per row (`canFor`), costing one
  query per relation, not per row; nothing is hidden in the page.
- **Same decision everywhere:** HTTP handlers, server functions and MCP tools call the same guard.
- **Seed and sign-in:** one seed definition per service with stable IDs, used by dev startup,
  tests and explicit seeding of a deployment; a sign-in picker for seeded people on remy-auth's
  login screen, through a real Better Auth code sign-in, gated by the environment policy in
  [development principles](../docs/development.md). Fixed from remy-sport's survey: no published
  code outside local development, no account creation through a fixed code, authenticated seeding
  outside local development, and re-seeding that does not silently overwrite edited rows unless
  asked.

What an app never has: its own users, sessions, login screens or authorization engine. What it
always has: its own data, its own relation vocabulary, and enforcement beside each operation. The
sample app (milestone 1) is the reference implementation, and its second isolated instance proves
app A's tokens grant nothing in app B.

Open within this decision: when the enforcement helpers split from `@joeblew999/remy-ui` into a
server-only package (at the second consumer), and the token lifetime and revocation delay
(decision 5).

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

## Building it on TanStack Start

Refreshed 2026-09-25: both apps and the shared package move to TanStack Start and Router
([TanStack plan](done/tanstack.md)), so the service, its screens and the sample are built on it.
Sources: Better Auth's [TanStack Start integration](https://www.better-auth.com/docs/integrations/tanstack)
and the installed skills `auth-server-primitives`, `auth-and-guards`, `server-functions`,
`middleware`, `server-routes`, `execution-model` and `router-query`.

| Concern | How it is built | Where it is enforced |
| --- | --- | --- |
| Better Auth endpoints | One catch-all server route, `src/routes/api/auth/$.ts`, whose `GET` and `POST` handlers return `auth.handler(request)`; OIDC, JWKS and MCP endpoints are served through it | Better Auth |
| Cookies | Better Auth's `tanstackStartCookies()` plugin, last in the plugin list; secure cookies with a host-bound prefix, `HttpOnly`, `Secure`, `SameSite=Lax` | Better Auth configuration |
| Reading the session | `auth.api.getSession({ headers: getRequestHeaders() })` inside a function middleware (`authMiddleware`) that puts a typed session in the server function's context; never at module scope, where Workers have no request | Server functions and server routes |
| The data boundary | Every server function or server route touching private data uses `authMiddleware` or re-checks inside its handler, then checks membership and permission for the target record; a parsed ID is not authorization | Inside each handler, beside the operation |
| Page UX | A root `beforeLoad` loads the session into router context; an `_authenticated` layout route redirects anonymous visitors to the localized login page with a validated return path | Routes (presentation only) |
| CSRF and origins | Better Auth `trustedOrigins` with the exact registered origins; non-GET server functions and routes accept same-origin requests only | Better Auth and middleware |
| Rate limits | Better Auth rate limiting on login, sign-up and recovery with shared storage (D1), since Workers run many instances and memory limits are per instance | Better Auth |
| Bindings | D1 and secrets via `import { env } from 'cloudflare:workers'`, the Better Auth instance created per request from them | Request scope |
| Login, sign-up, recovery, consent | Localized routes built from the shared shadcn components (Field, Input, Button, Alert, Card) and Paraglide, `noindex`, submitting through validated server functions; the same error message for unknown user and wrong password | remy-auth |
| The sample consumer | `examples/sample-app/` on TanStack Start too: OAuth authorization code with `state` and PKCE against remy-auth, notes list and create through server functions with TanStack Query, the MCP adapter as a server route calling the same permission decision | The sample's own handlers |
| Observability | The shared observability wrapper plus function middleware adding the request ID and a bounded reason code to every auth and authorization outcome | Middleware |


### Roles and relationships on TanStack

RBAC first, through Better Auth's organization roles and custom permissions (installed skill
`organization-best-practices`); ReBAC only if the sharing examples below need it (decision 6).

| Concern | How | Where |
| --- | --- | --- |
| Role checks | A function-middleware factory, `requirePermission(resource, action)`, composed after `authMiddleware`, so each server function states its rule in one line | Server functions and server routes |
| Relationship checks | The shared relation engine inside the app, from the app's own tables, after input validation, because they need the specific record | Handlers, through the shared guard |
| Roles in the page | The session's roles and permissions travel in router context only to shape the page (hide an Edit button); `beforeLoad` role gates are navigation UX | Routes (presentation only) |
| Client caches | Router loader cache and TanStack Query keys include user and organization; logout, role change and membership removal invalidate them (`router.invalidate`, Query invalidation); the cache lifetime counts towards the maximum revocation delay (decision 5) | Router and Query configuration |
| Rendering | Protected routes are never prerendered and never share a public cache; they render per request or in the browser | Route `ssr` and `Cache-Control` |

Checks: a role removed mid-session is refused on the next server call, and the client drops the
cached protected data within the recorded revocation delay.

Sharing examples to write before the ReBAC decision (fill in with the owner):

1. A note shared with one person outside the organization's roles: _to define_.
2. A record visible to a team within an organization but not the whole organization: _to define_.
3. Delegated access for an agent or CLI to one resource only: _to define_.

Not documented for Workers by Better Auth, so the first step of milestone 1 is a spike on the
pinned versions: `tanstackStartCookies()` and the catch-all route under the Cloudflare Vite plugin,
the chosen D1 adapter with `auth generate` and Wrangler migrations, and session reads across two
Worker instances. Report incompatibilities rather than switching stores or plugins silently.

Checks to add, reusing the shared checks' style: an unauthenticated direct call to every
protected server function and server route is rejected before any data is returned; anonymous
redirects and login pages name no protected user, tenant or record; logout invalidates the
session across instances.

## Milestone 1: service plus runnable in-repo sample

Executor-owned areas in this repo: tool/dependency pins, Worker entry, auth config,
login/consent UI, identity schema and numbered migrations, registration interface,
versioned consumer contract, `examples/sample-app/`, local startup and integration
tests. Exact service file layout
is chosen during scaffolding; keep configuration beside the behaviour it controls.
This milestone must run and pass entirely inside remy-auth without a Remy Data
checkout. Remy Data integration follows afterward under
[its own plan](https://github.com/joeblew999/remy-data/blob/main/.plans/auth.md) and instructions.

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

The [done GUI plan](done/gui.md) defines additional acceptance for package reuse, localized
server-rendered content, accessibility and technical SEO.

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
agent-skill installation/listing tasks exist. `project:dev` starts the GUI proof;
auth service/sample orchestration and database migration tasks remain to be built. Do not add duplicate shell frameworks or a fleet task library. CI must be
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

## Agent skills for this slice

Installed TanStack skills for this slice: `auth-server-primitives`, `auth-and-guards`,
`server-functions`, `middleware`, `server-routes`, `execution-model`, `router-query`. Carried over from the [agent-skills plan](done/agent-skills.md): before choosing the adapter
(Kysely D1 dialect or Drizzle), `auth generate` and numbered D1 migrations via Wrangler, check
whether the installed `create-auth`, `better-auth-best-practices`, `wrangler` and
`workers-best-practices` skills cover them for the pinned versions; otherwise use
https://www.better-auth.com/llms.txt. Record the outcome in that plan's table.

## Observability for the auth service

Moved from [the generic observability plan](observability.md), which covers Worker health,
tracing, the log contract, releases, availability and the generic alerts.

| Area | Signals and implementation |
| --- | --- |
| Auth behavior | Login success/failure counts, verification/recovery outcomes, token issuance/refresh/revocation and rate-limit denials |
| Authorization | Bounded reason codes for scope, audience, membership and permission denial; HTTP/MCP parity |
| D1 | Query errors/latency, read/write volume, database size, query efficiency and migration failures |
| Dependencies | Email/provider failures and timeouts, JWKS/discovery failures, audit persistence failures |

Use [D1 metrics](https://developers.cloudflare.com/d1/observability/metrics-analytics/) for D1.
Browser redirect legs need a non-secret flow identifier if they cannot share a trace; do not
promise a single trace across every OAuth hop. Apply the log field rules to Better Auth's logger.
Saved views: login outcomes and 429s, HTTP/MCP denials, D1 and dependency failures.

| Rule | Trigger | Response |
| --- | --- | --- |
| Audit durability | Any unrecovered critical audit-write failure | Investigate affected privileged mutations immediately |
| Abuse | Sustained login failures/429s above baseline | Inspect aggregate patterns; do not treat ordinary 401s as outages |

### Durable security audit

Record administrator actions, user lifecycle changes, membership/role changes,
client registrations/grants, credential rotation, consent and revocation. Audit
records contain event ID, timestamp, actor type/ID, target, organization, action,
result, request ID and sanitized change metadata. Cover both API and CLI actions.

Implement application-owned audit tables in D1 with restricted query access and
an explicit retention policy. Do not rely on sampled console logs, `wrangler tail`
or the optional Better Auth hosted dashboard for completeness. Cloudflare account
audit logs cover platform administration, not all Remy end-user actions.

Choose hooks against the installed Better Auth version. A background console log
is not durable delivery. Define a D1-compatible atomic batch/outbox or reconciled
delivery mechanism before claiming atomic mutation/audit coverage; do not assume
Better Auth hooks provide interactive transactions on D1. Define failure behavior
for critical privilege mutations and test crash/retry/deduplication. Never mark a
failed or merely attempted action as successfully completed in the audit record.

Acceptance: verify success, expected denial, unexpected failure, slow dependency and D1 failure
locally; correlation across browser, CLI, HTTP and MCP; audit completeness, persistence failure,
retry deduplication and access control.
