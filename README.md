# Remy Auth

https://github.com/joeblew999/remy-auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers**
with **D1** as the planned identity and session store.

**Status:** a minimal GUI proof runs locally on Cloudflare: English, Spanish and Arabic
public pages, a client-rendered demo and a shared shadcn/Paraglide package. Authentication,
D1 storage and deployment are still planned.

## Get started

Install [mise](https://mise.jdx.dev/getting-started.html), then run from this checkout:

```sh
mise install
mise run project:setup
mise run project:dev
```

Open [localhost:5173/en](http://127.0.0.1:5173/en); switch to Spanish or try the demo.
Setup installs dependencies and skills, registers MCP, then runs build and browser checks.

Remote : https://remy-auth.gedw99.workers.dev/ 

Setup installs the pinned **Codex CLI**; authenticate when prompted. **Claude Code**
is optional and installed separately.
Install **Google Chrome** before setup; browser checks use the installed Chrome.

## Work with an agent

**VS Code:** use the installed Codex extension. After changing skills or MCP,
run `mise run mcp:register`, then open the Command Palette (`Cmd+Shift+P` on Mac)
and select **Developer: Reload Window**. Reopen Codex and continue your conversation.
The extension uses Codex configuration; it does not need the terminal CLI to run.

**Terminal:** use these tasks for standalone agent sessions:

| | Codex | Claude Code |
| --- | --- | --- |
| Start a conversation | `mise run codex:start` | `mise run claude:start` |
| Resume the latest conversation | `mise run codex:resume` | `mise run claude:resume` |

To reload a terminal agent, type `/exit` in the agent, then run its
resume command. Each launch refreshes MCP registration. Use `/mcp` inside the
agent to check the connection; accept any project trust or server approval prompt.

Skills supply guidance; MCP supplies callable tools. Setup includes Better Auth,
Cloudflare, Chrome DevTools, Modern Web Guidance, shadcn, Playwright, GitHub release
and TanStack Router/Start skills, plus the Chrome DevTools MCP server.

## Everyday commands

| Task | Command |
| --- | --- |
| Browse project tasks | `mise tasks ls --local` |
| Run the local GUI | `mise run project:dev` |
| Try the production build locally | `mise run project:preview` |
| Verify the setup | `mise run project:verify` |
| Diagnose mise itself | `mise doctor` |
| Check for package updates | `mise run packages:check` |
| Upgrade packages, including major versions | `mise run packages:upgrade` |
| Better Auth CLI help | `mise run auth:cli -- --help` |
| Cloudflare CLI help | `mise run cf:cli -- --help` |
| Inspect browser tooling | `mise run browser:cli -- --help` |
| Inspect MCP status in both clients | `mise run mcp:status` |

Local preview and remote deployment use the same build and Wrangler configuration.
See [local/remote commands](docs/gui.md#one-scaffold-for-local-and-cloudflare)
for deployment and running the same tests against a deployed URL.

Review dependency changes after upgrading. Node is pinned in [mise.toml](mise.toml); the
skill-source commits and the shared agent bootstrap tasks live in
[tasks/](tasks/README.md), one file per task namespace, which other projects include by git reference.

## Project documentation

- [GUI proof](docs/gui.md) — routes, shared package and what the checks prove.
- [Tooling reference](docs/tooling.md) — skills, MCP, browser sessions, upgrades and troubleshooting.
- [GUI plan](.plans/done/gui.md) — done: reusable React packages, internationalisation and SEO.
- [TanStack plan](.plans/tanstack.md) — agreed: move both apps and the package from React Router to TanStack Start and Router.
- [OpenAPI contracts plan](.plans/openapi-contracts.md) — proposed: contract-first APIs with oRPC, producing and consuming OpenAPI with runtime validation.
- [Portal plan](.plans/gui-portal.md) — open: hosted login screens, and the GUI decisions still yours.
- [Shared UI plan](.plans/done/shared-ui.md) — done: the language code in the package, SSR proven from the tarball, and the `remy-auth-app` consumer.
- [Implementation plan](.plans/auth-service.md) — auth service and the first local sample app.
- [Better Auth ecosystem](.plans/better-auth-ecosystem.md) — plugins, CLI and GUI options.
- [Observability plan](.plans/observability.md) — Cloudflare logs, traces, metrics and audit records.
- [Agent skills plan](.plans/done/agent-skills.md) — finding and vetting skills for uncovered dependencies.
- [Development principles](docs/development.md) — ownership, storage and contribution rules.

The next slice adds Better Auth and local D1. The GUI proof emits request logs;
production observability and the independent authenticated sample remain planned.
