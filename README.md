# Remy Auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers**
with **D1** as the planned identity and session store.

**Status:** developer tooling is ready. The auth service, sample app, database and
Cloudflare deployment are still planned.

## Get started

Install [mise](https://mise.jdx.dev/getting-started.html), then run from this checkout:

```sh
mise install
mise run project:setup
```

Setup installs locked npm packages and 28 official agent skills, registers Chrome
DevTools MCP for Codex and Claude, and verifies the configuration.

For agent work, install and authenticate **Codex or Claude Code** separately.
Install **Google Chrome** for browser tooling.

## Work with an agent

| | Codex | Claude Code |
| --- | --- | --- |
| Start a conversation | `mise run codex:start` | `mise run claude:start` |
| Resume the latest conversation | `mise run codex:resume` | `mise run claude:resume` |

To reload skills or MCP configuration, type `/exit` in the agent, then run its
resume command. Each launch refreshes MCP registration. Use `/mcp` inside the
agent to check the connection; accept any project trust or server approval prompt.

Skills supply guidance; MCP supplies callable tools. Setup includes Better Auth,
Cloudflare, Chrome DevTools and Modern Web Guidance skills, plus the Chrome
DevTools MCP server.

## Everyday commands

| Task | Command |
| --- | --- |
| Browse project tasks | `mise tasks ls --local` |
| Verify the setup | `mise run project:verify` |
| Diagnose mise itself | `mise doctor` |
| Check for package updates | `mise run packages:check` |
| Upgrade packages, including major versions | `mise run packages:upgrade` |
| Better Auth CLI help | `mise run auth:cli -- --help` |
| Cloudflare CLI help | `mise run cf:cli -- --help` |
| Inspect browser tooling | `mise run browser:cli -- --help` |
| Inspect MCP status in both clients | `mise run mcp:status` |

Review dependency changes after upgrading. Node and skill-source commits are
pinned separately in [mise.toml](mise.toml).

## Project documentation

- [Tooling reference](docs/tooling.md) — skills, MCP, browser sessions, upgrades and troubleshooting.
- [Implementation plan](.plans/auth-service.md) — auth service and the first local sample app.
- [Better Auth ecosystem](.plans/better-auth-ecosystem.md) — plugins, CLI and GUI options.
- [Observability plan](.plans/observability.md) — Cloudflare logs, traces, metrics and audit records.
- [Development principles](docs/development.md) — ownership, storage and contribution rules.

The next milestone is a working local auth service and sample app. Observability
collection settings exist, but live instrumentation, dashboards and alerts still
need implementation. SCIM is deferred until directory provisioning is needed.
