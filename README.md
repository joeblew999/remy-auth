# Remy Auth

Shared identity and authentication service for Remy applications, built around
Better Auth and deployed independently on Cloudflare Workers.

**Status: application planning; developer CLIs and agent tooling available.** No application,
database or deployment exists yet. Start with [the implementation plan](.plans/auth-service.md).
See the [Better Auth ecosystem inventory](.plans/better-auth-ecosystem.md) for CLI,
plugin directories, GUI options, compatibility gates and the proposed adoption order.

## Developer CLI

```sh
mise install
mise run project:setup
mise run auth:cli -- --help
mise run cf:cli -- --help
mise run auth:info
```

Node is pinned in `mise.toml`; Better Auth CLI (`auth`), Wrangler, Chrome DevTools and Modern Web Guidance are pinned in
`package.json` and `package-lock.json`. `project:setup` runs `npm ci`, installs skills from four official
sources for Codex and Claude, registers project MCP tooling, then runs `mise run project:verify`. It stops on any
failed step. Commands use the local binaries and accept upstream CLI
arguments after `--`; they do not download a different CLI at execution time.

For example, `mise run auth:cli -- generate --help` describes schema generation, and
`mise run cf:cli -- d1 --help` shows D1 operations. `project:doctor` checks tool versions
without logging into Cloudflare. `auth:info` reports the current scaffold; an auth
configuration and database have not been created yet. Schema generation, migrations
and admin creation will be wired to local D1 during service implementation.
An `Unknown` Better Auth version in `auth:info` is expected until the application
library is added; `project:doctor` reports the installed CLI version separately.

These are developer/operator tools. Remy end-user CLI login and delegated API calls
remain part of the service milestone. Cloudflare login, provisioning and deployment
are explicit later operations.

### Package upgrades

```sh
mise run packages:check   # Preview available updates
mise run packages:upgrade          # Apply latest versions, including majors
```

All project tasks use a namespace. List them with `mise tasks ls --local`.

Mise's built-in commands keep their normal meaning:

| Built-in command | Behavior in this repo |
| --- | --- |
| `mise install` | Install configured runtimes; use `project:setup` for npm packages and skills |
| `mise tasks ls --local` | Discover the project's namespaced tasks |
| `mise run` | Open mise's task selector in an interactive terminal; no automatic setup or deployment |
| `mise exec -- node --version` | Execute using the configured Node version |
| `mise doctor` | Diagnose the machine's mise installation; `project:doctor` checks project CLIs |
| `mise outdated` / `mise upgrade --local --dry-run` | Inspect runtime updates; npm upgrades use `packages:upgrade` |
| `mise fmt --check` | Check mise.toml formatting |
| `mise run --dry-run project:setup` | Preview the complete ordered setup sequence |

An exact Node pin stays fixed under ordinary `mise upgrade`. Use the built-in
`mise upgrade --local --bump node` only when intentionally changing it, and review
`package.json`'s Node engine constraint together with the new version. Parent and
global mise configurations can add tools; this repo declares only Node.
See [mise's task execution](https://mise.jdx.dev/tasks/running-tasks.html) and
[runtime upgrade behavior](https://mise.jdx.dev/cli/upgrade.html).

CLI passthrough tasks accept upstream flags directly, such as
`mise run auth:cli --help` and `mise run cf:cli d1 --help`.

| Namespace | Purpose |
| --- | --- |
| `project:*` | Setup, verification and tool diagnostics |
| `packages:*` | Check and upgrade npm packages |
| `skills:*` | Install and list four official skill sources |
| `auth:*` | Better Auth CLI and diagnostics |
| `cf:*` | Cloudflare CLI and live logs |
| `browser:*` | Chrome DevTools CLI, session lifecycle and MCP server |
| `web:*` | Modern web guidance search and retrieval |
| `mcp:*` | Register, verify and inspect project MCP connections |
| `codex:*` / `claude:*` | Start or resume an interactive agent session |

After `project:setup`, `packages:upgrade` uses the locally pinned `npm-check-updates` to move npm
dependencies past existing version pins, saves exact versions, installs them and
refreshes `package-lock.json`. It then runs the full tooling verification task.
Peer conflicts fail visibly; the task does not use npm's `--force` or
`--legacy-peer-deps`. Review the manifest/lockfile diff and any major-version
migration requirements. If installation fails after manifest updates, resolve the
reported conflict before using `project:setup`; no automatic rollback discards your edits.

`project:setup` continues to reproduce the lockfile. Node and skill-source pins in
`mise.toml` are managed separately. CLI checks do not establish auth-service runtime
compatibility; add service tests to the upgrade workflow when the service exists.

### Verification

Run `mise run project:verify` at any time; `project:setup` and `packages:upgrade` also finish with it. It checks
mise tasks, installed dependencies, CLI versions, manifest/lockfile consistency,
Wrangler configuration and observability settings, and all four skill sources' pinned
sources, files and Claude symlinks. It uses the existing local installation and
does not provision Cloudflare resources. Skill checks cover the lockfile inventory,
not upstream discovery or content-integrity hashes.

The Wrangler check uses its own configuration reader; it is not a deployment
dry-run. Add typechecking, build and runtime tests when application code exists.

## Browser tooling

Google's [Chrome DevTools agent tools](https://developer.chrome.com/docs/devtools/agents)
provide browser interaction, screenshots, accessibility inspection, network/cookie
debugging, Lighthouse and performance analysis. Install Google Chrome separately;
it is already available on this machine. The CLI is experimental and pinned with
the other npm tools, so `packages:upgrade` updates it too.

```sh
mise run browser:start                          # Isolated, headless Chrome session
mise run browser:cli -- new_page http://localhost:3000
mise run browser:cli -- list_pages
mise run browser:cli -- take_snapshot 1          # Use the returned page ID
mise run browser:cli -- click 1 "UID_FROM_SNAPSHOT"            # Use a UID from the snapshot
mise run browser:stop
```

Run `browser:start --headless=false` through mise for a visible window. Start once
per session; subsequent CLI calls reuse the background daemon. Starting again
restarts that daemon. These sessions use a temporary Chrome profile; the start task
disables tool usage telemetry and CrUX URL uploads. Stop the session when finished.
Use `mise run browser:cli -- --help` for upstream commands.

### Start or reload your agent

After `mise run project:setup`, use the installed Codex or Claude Code CLI:

```sh
mise run codex:start     # New Codex conversation
mise run codex:resume    # Resume latest Codex conversation in this project
mise run claude:start    # New Claude conversation
mise run claude:resume   # Resume latest Claude conversation in this project
```

To reload skills and MCP configuration, exit the current agent with `/exit`, then
run its `:resume` task from your terminal. These tasks refresh MCP registration,
launch from the repository root and preserve interactive terminal input/output.
They do not stop another running session. Use `/mcp` inside the agent to check the
connection. Pass additional upstream options after `--`, for example
`mise run codex:start -- --help`. Install and authenticate your chosen agent CLI
separately; launching one does not require the other.

### MCP registration

Skills provide instructions and workflows; MCP provides callable tools. Chrome
DevTools uses both. Modern Web Guidance uses its CLI, and many auth/Cloudflare
skills also work through the existing CLIs; a skill does not automatically require
an MCP server.

```sh
mise run mcp:register   # Also runs during project:setup
mise run mcp:verify     # Also runs during project:verify
mise run mcp:status     # Requires both Codex and Claude CLIs
```

Registration writes the `chrome-devtools` entry to project-local `.codex/config.toml`
and `.mcp.json`. Each client launches `browser:mcp` through the current mise executable
with an explicit repository path. Generated files contain machine-specific paths
and are gitignored; rerun registration after moving the checkout or mise executable.
Unrelated settings and servers are preserved. Changed existing files receive a
`.bak` recovery copy; TOML serialization can normalize formatting and comments.

The server uses the pinned npm package, an isolated headless Chrome profile, and
has tool telemetry and CrUX uploads disabled. The MCP process is separate from the
CLI's `browser:start`/`browser:stop` session; the agent client manages its lifetime.

Reload the agent after registration. Codex only loads project configuration in a
trusted project. Claude may show **Pending approval** for a new project MCP server;
review it in Claude's `/mcp` interface. Registration does not bypass client trust or
approval settings. See [Codex MCP configuration](https://developers.openai.com/codex/mcp)
and [Claude MCP scopes](https://code.claude.com/docs/en/mcp).

`mcp:verify` checks configuration, not a live connection. `mcp:status` shows what
the clients see (Claude also checks connectivity for approved servers).

### Modern web implementation guidance

Google's [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance)
complements browser inspection with implementation guidance for native HTML/CSS,
forms, accessibility, performance, passkeys and browser compatibility. The main
`modern-web-guidance` skill is installed for both agents. The separate
`chrome-extensions` skill is omitted because this project is a web service and UI.

```sh
mise run web:guidance -- search "animate a dialog modal backdrop"
mise run web:guidance -- retrieve "GUIDE_ID_FROM_SEARCH"
mise run web:guidance -- list
```

Use the locally pinned `web:guidance` task in this repo in place of the upstream
skill's `npx modern-web-guidance@latest` examples. `packages:upgrade` updates the CLI;
`skills:install` restores the commit-pinned skill. Google's alternative `skills`
installer keeps our existing `.agents` and `.claude` layout without a second
installer or automatic skill updates. The mise task disables usage telemetry. If
a search returns no matches, use `list` to browse guide IDs. Browser support defaults to the skill's
**Baseline Widely available** policy, with fallbacks for newer features.

## Cloudflare observability

The [observability plan](.plans/observability.md) covers logs, traces, metrics,
D1 health, durable auth audit records, correlation, dashboards and alerts.
`wrangler.jsonc` enables logs/traces and URL query redaction for the future Worker.
It still needs a Worker entry and D1 binding before it is deployable.

```sh
mise run cf:logs -- --help
mise run cf:errors -- --help
```

After deployment, both tasks use the configured Worker; `cf:logs` also accepts an
explicit Worker name. `cf:errors` filters Worker
invocation failures, not all HTTP error responses. Instrumentation, durable audit
storage, dashboards and alert delivery are required implementation work; they are
not live yet.

## Agent skills

Install the complete official [Better Auth](https://github.com/better-auth/skills),
[Cloudflare](https://github.com/cloudflare/skills) and
[Chrome DevTools](https://github.com/ChromeDevTools/chrome-devtools-mcp/tree/main/skills) packs,
plus the main [Modern Web Guidance](https://github.com/GoogleChrome/modern-web-guidance)
skill locally for this project:

```sh
mise install
mise run skills:install
mise run skills:list
```

[mise.toml](mise.toml) pins Node, the skills CLI and all four upstream skill commits.
Skills live in `.agents/skills/`; `.claude/skills/` links to the same files.
The installer records provenance in `skills-lock.json`. Re-running installation
restores the selected skills from all four pinned sources; update their source commits deliberately to adopt upstream
changes. Keep the generated skill files, links and lockfile in version control.
The packs include auth setup/security and Cloudflare platform, Workers, Wrangler,
storage and other official Cloudflare guidance. The seven Chrome skills cover the
CLI, MCP, accessibility, cookies, LCP, memory leaks and troubleshooting. Modern Web Guidance adds implementation patterns
and compatibility guidance (28 skills total across four sources). Reload an existing agent session
if newly installed skills are not yet visible.

## Ownership

This service owns login, users, sessions, organizations, memberships, application
registrations and token issuance. Each application owns its business records,
resource permissions and enforcement beside its API contract. HTTP and MCP entry
points must enforce the same application permissions.

The first consumer will be a runnable sample app in `examples/sample-app/`, with
a browser UI, protected HTTP API and MCP access. The auth service and sample run
locally from this repository so the full flow can be verified before app migration.

[Remy Data](https://github.com/joeblew999/remy-data) is the first external consumer. Its
[integration plan](https://github.com/joeblew999/remy-data/blob/main/.plans/auth.md)
tracks adoption there; that link becomes available once the local plan is pushed.
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
- Apps integrate through a versioned protocol/contract, never direct access to this
  service's database. App data and auth provisioning are separate operations.
- Failures remain visible. Never grant access because auth is unavailable.
- Keep credentials out of code, plans, logs and commits.

Cloudflare storage is the chosen direction, with D1 as the planned identity and
session database. Verify the required Better Auth plugins against the pinned D1
adapter before implementation acceptance. SCIM is deferred until directory
provisioning is needed; PostgreSQL/Hyperdrive is not part of the current plan.
No community ReBAC plugin has been selected.

For developers and agents: read the plan before implementation. Use the roles
Executor and Reviewer; keep plans in `.plans/` and move them to `.plans/done/`
only after implementation, required checks and reviewer acceptance. This repository
creation authorizes the planning scaffold, not production provisioning or rollout.
