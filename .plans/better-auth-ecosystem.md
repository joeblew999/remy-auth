# Better Auth ecosystem and adoption inventory

Status: researched proposal, 2026-09-24. No packages installed or services provisioned.
Companion to [the service implementation plan](auth-service.md).

## Recommendation

Build on Better Auth's supported APIs, CLI and plugin model, with a deliberate
adoption path for its broader capabilities. Start with identity, organizations,
administration and the browser/CLI/HTTP/MCP flows already required by our sample.
Add account-security and enterprise features in separately verified increments.

Cloudflare-native storage is the selected direction, starting with Workers and D1
for identity and sessions. SCIM is deferred until directory provisioning is needed;
PostgreSQL/Hyperdrive is outside the current scope. Prefer existing user-facing components and the official operations dashboard
where they fit. Retain Remy ownership of application registration, consent policy,
resource permissions and the consumer contract.

This is a capability inventory and proposed sequence, not evidence that a particular
package combination works on Workers. Exact versions, licenses, peer dependencies,
runtime compatibility and acceptance tests remain implementation gates.

Registry metadata checked on 2026-09-24 reports `better-auth`, `auth`,
`@better-auth/mcp` and `@better-auth/oauth-provider` at latest `1.7.5`;
`@better-auth/infra` is independently versioned at `0.4.11`. The old
`@better-auth/cli` latest is `1.4.21` and marked deprecated. Sources:
[core metadata](https://registry.npmjs.org/better-auth),
[CLI metadata](https://registry.npmjs.org/auth),
[MCP metadata](https://registry.npmjs.org/@better-auth/mcp),
[OAuth metadata](https://registry.npmjs.org/@better-auth/oauth-provider),
[Infrastructure metadata](https://registry.npmjs.org/@better-auth/infra),
[deprecated CLI metadata](https://registry.npmjs.org/@better-auth/cli).
These are research candidates, not installed pins or a tested compatibility set.

## Discovery and plugin registry

There is an [official plugin catalogue](https://better-auth.com/docs/plugins) and a
searchable [community directory](https://better-auth.com/docs/plugins/community-plugins).
The latter explicitly says community plugins are not official or verified.

The documented distribution model is npm packages or exports from `better-auth`,
followed by registration in server configuration and, where required, client
configuration. Schema changes require migrations. I found no documented universal
runtime marketplace that installs arbitrary plugins from an admin GUI. Treat the
directories as discovery tools, not dependency approval or compatibility guarantees.
See [plugin composition](https://better-auth.com/docs/concepts/plugins).

Maintain our selected-plugin inventory beside the auth config: package/export,
exact version, purpose, server/client setup, schema changes, required secrets or
services, runtime/database evidence, UI coverage, owner and verification command.
An upgrade should review this inventory and regenerate schema/API differences.

## Three different CLI needs

### Better Auth development CLI

Current [CLI documentation](https://better-auth.com/docs/concepts/cli) uses
`npx auth@latest`, rather than older examples using `@better-auth/cli`.
Documented commands include `init`, `generate`, `migrate`, `create-admin`, `upgrade`,
`info` and `secret`. `init` currently documents Next.js and SQLite support; it is
not a ready-made generator for our Worker architecture. Direct `migrate` is for the
built-in Kysely adapter; other adapters use their ORM migration tooling.

Pin the CLI locally and invoke it through mise tasks once scaffolding exists.
Use `generate` to review schema changes, `info` for diagnostics, and explicit
admin bootstrap after schema installation. Keep secret generation out of captured
logs. Review `upgrade` changes before accepting a new lockfile.

Proposed project tasks, **not implemented commands**:

| Task | Purpose |
| --- | --- |
| `mise run auth:info` | Diagnose the pinned configuration |
| `mise run auth:schema` | Generate schema for review |
| `mise run db:migrate:local` | Apply local migrations using the selected adapter's tooling |
| `mise run auth:bootstrap:local` | Explicitly create the initial local administrator |
| `mise run auth:register:local` | Idempotently register sample clients and access |
| `mise run project:dev` | Start auth and sample with local storage |
| `mise run project:verify` | Run the service plan's runtime and integration checks |

### Remy end-user CLI

We still need a thin consumer CLI with login, status, logout and sample operations.
It should exercise delegated access to the same protected operations as the browser.
Use authorization code with PKCE and a local browser callback as the initial candidate.
Evaluate [Device Authorization](https://better-auth.com/docs/plugins/device-authorization)
for headless/remote terminals; it also needs an approval screen and polling handling.

The [OAuth Provider](https://better-auth.com/docs/plugins/oauth-provider) supports
user authorization and machine client credentials. Define credential storage,
refresh, revocation, audience and organization selection in our CLI contract.
Machine identities need explicit grants; they must not inherit a human administrator's
session or permissions. An API key is a separate optional access mechanism.

### Operator CLI

Better Auth's development CLI is not our complete registration or operations CLI.
Add thin commands over authorized service APIs for client registrations, credential
rotation and access grants. Use the same service policy as any future operator UI.
Do not manipulate auth tables directly to bypass hooks or audit behavior.

## GUI options

| Tool | What it provides | Proposed use |
| --- | --- | --- |
| [Official Dashboard](https://better-auth.com/docs/infrastructure/plugins/dashboard) | Hosted management of users, sessions, organizations, analytics and audit events through `dash()` from `@better-auth/infra` | First operations-dashboard candidate; verify plugin/version coverage and remote connectivity |
| [Better Auth UI](https://better-auth-ui.com/docs) | Community auth components with shadcn/ui, HeroUI and Solid options | Evaluate for hosted login/account screens; verify Base UI, Paraglide and rendering compatibility per the GUI plan |
| [Better Auth Studio](https://www.better-auth.studio/) | Community admin GUI, launched by its own CLI | Local evaluation candidate; self-hosted production mode is explicitly beta |
| [Better Auth Console](https://better-auth-console.com/docs) | Community self-hosted dashboard across multiple auth databases | Alternative if we need self-hosted operations; direct database access needs architectural review |
| [better-auth-devtools](https://github.com/C-W-D-Harshit/better-auth-devtools) | Community React panel for test users, session inspection and role switching | Optional local/test aid, excluded from production builds and routes |
| [Open API plugin](https://better-auth.com/docs/plugins/open-api) | Official Scalar reference and interactive endpoint testing | Enable for local development; default reference path is `/api/auth/reference` |

The official [Infrastructure service](https://better-auth.com/docs/infrastructure/introduction)
also offers security detection, transactional messaging and enterprise services.
The framework remains free/open source. At research time, [pricing](https://better-auth.com/pricing)
lists a free Starter tier, Pro at $20/month plus usage, and custom Enterprise.
Dashboard RBAC is listed under Enterprise; include this in the operator-access decision.
Do not assume a hosted dashboard is self-hostable or usable against isolated localhost.

[Studio self-hosting](https://www.better-auth.studio/self-hosting) documents beta
status and database/adapter prerequisites. [Console self-hosting](https://better-auth-console.com/docs/self-host)
documents PostgreSQL and a Node.js deployment. Neither is established here as a
Worker/D1-compatible drop-in. A direct-database console would be a privileged part
of the auth service's operational boundary, never an ordinary consumer app.

Screens we need to account for: sign-in, verification/recovery, account and session
settings, organization selection/invitations, OAuth consent, device approval if
enabled, and operator registration/access management. Audit each candidate's actual
coverage; a login component library does not establish coverage of every plugin.

## Feature adoption matrix

These priorities are recommendations for Remy, not assertions of tested support.
The [official catalogue](https://better-auth.com/docs/plugins) is the discovery source
for the feature families below; consult each plugin's versioned documentation before use.

| Capability | Proposed stage | Integration work / acceptance gate |
| --- | --- | --- |
| Core users, sessions, email/password | First sample | Proposed initial local login; explicit bootstrap, verification/recovery hooks, local mail capture |
| Organization and Admin | First sample | Membership/roles, invitations, operator authorization; keep application permissions local |
| OAuth/OIDC, JWT/JWKS and MCP | First sample | Discovery, consent, resource audiences, signing keys, separate consumer verification |
| CLI delegation and machine credentials | First sample | Public/confidential client distinction, explicit grants, token storage/rotation |
| Open API and Test Utils | First sample tooling | API reference and disposable fixtures; real Worker tests remain necessary |
| Passkeys and two-factor | Next, before production policy sign-off | Enrollment, recovery, step-up rules, origin/RP configuration and browser tests |
| Social login, magic link or email OTP | Next, select methods | Provider credentials, delivery service, account-linking policy and recovery |
| API Key | When consumers need it | Ownership, scopes, expiry, rotation, revocation and audit policy |
| Device Authorization | CLI follow-up | Approval UX, polling and credential lifecycle |
| SSO | When a customer needs enterprise login | Tenant onboarding, provider setup and identity mapping; does not require SCIM |
| SCIM | Deferred; no current requirement | Revisit only for directory provisioning; incompatible with D1's transaction capabilities |
| Agent Auth | Separate evaluation | Define required delegated capabilities and revocation before adoption |
| Captcha, compromised-password checks, managed security | Production hardening | Abuse model, provider selection, rate limits and outage behavior |
| Multi Session, last-login hints, username, anonymous, phone | Demand-driven | UX need, identity linking and upgrade behavior |
| Generic OAuth, One Tap, wallet login | Demand-driven | Concrete provider/client requirement |
| Bearer, one-time token, OAuth Proxy, i18n | Demand-driven | Specific protocol/UX need and compatibility |
| Billing/payment and referral/attribution integrations | Application-owned by default | Select provider only when billing or attribution is in scope |
| Community ReBAC/Zanzibar | Research only | Concrete sharing model and app-owned relationship storage; see service plan |

## Runtime and storage gates

1. **D1 first:** Better Auth documents [native D1 support](https://better-auth.com/blog/1-5).
   Use D1 for users, accounts, sessions, organizations and selected plugin tables.
   Test migrations and the required plugin operations with the pinned adapter.
   [SCIM requires native interactive transactions](https://better-auth.com/docs/plugins/scim#enable-database-transactions)
   and explicitly excludes D1; it is deferred, not a reason to add another database now.
2. **Local parity:** use Wrangler's [local development](https://developers.cloudflare.com/workers/local-development/)
   with local D1 bindings and explicit local migrations. Record setup/cleanup in mise;
   keep sample business storage separate. Start without auth read replicas or session
   caches; evaluate their consistency and revocation effects before enabling them.
3. **MCP composition:** current [MCP docs](https://better-auth.com/docs/plugins/mcp)
   use `@better-auth/mcp` with JWT and recommend CIMD. `mcp()` already configures
   the OAuth provider; do not also register `oauthProvider()` in that configuration.
   Workers need an equivalent secure metadata-fetch transport rather than the
   provided Node transport. Prove its address validation, connection pinning and
   redirect behavior before accepting that discovery path. Start with explicitly
   registered clients if dynamic discovery is deferred; document that limitation.
4. **Cloudflare helper:** [better-auth-cloudflare](https://github.com/zpg6/better-auth-cloudflare)
   is a community integration candidate for Workers bindings, storage and tooling.
   Review the wrapper independently; its provisioning CLI does not replace our
   explicit local-first setup or prove all plugins work.
5. **Distributed operation:** test session invalidation, rate limits, signing-key
   rotation and authorization freshness across instances. Define when introspection
   or current membership checks are required; a valid JWT is not a live permission check.

Cloudflare storage additions are optional. [KV is eventually consistent](https://developers.cloudflare.com/kv/concepts/how-kv-works/),
so it is not the initial authority for session revocation or membership changes.
Consider Durable Objects only if a requirement needs coordinated state, and R2 only
for blobs such as uploads or exported archives. See Cloudflare's
[storage options](https://developers.cloudflare.com/workers/platform/storage-options/).
Keep service secrets in Worker secrets rather than in committed configuration.

## Documentation and agent tooling

Official developer resources include [agent skills](https://better-auth.com/docs/ai-resources/skills)
from `better-auth/skills` and a [documentation MCP server](https://better-auth.com/docs/ai-resources/mcp)
at `https://mcp.better-auth.com/mcp`. The docs show `npx skills add better-auth/skills`
and `npx auth@latest mcp` for setup. Evaluate and pin the skill source before adding
it to this project's tooling. The documentation MCP server is distinct from MCP
authentication in Remy applications. No agent configuration was changed by this research.

## Work sequence and completion evidence

1. Verify D1/Workers feasibility for the required browser, CLI, HTTP and MCP flows;
   select exact package versions and record peer-dependency compatibility.
2. Scaffold pinned tools and the local service/sample. Implement the first-sample
   rows above and the existing plan's two-consumer isolation checks.
3. Evaluate user components and one operations GUI against the running service;
   record supported screens, plugin gaps, runtime needs and operating cost.
4. Complete account-security, email delivery and operational recovery requirements.
5. Verify additional SSO, agent or device flows when required in bounded milestones.
   Reopen SCIM only when a concrete directory-provisioning need exists.

For every enabled capability, completion means configuration, migrations, UI/CLI
coverage where needed, success and denial tests, revocation/recovery behavior and
an operator runbook. Existing rollout and manual-only CI constraints still apply.
This research does not mark any implementation milestone complete.
