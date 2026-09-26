---
title: "Remy Auth"
description: "Shared authentication for Remy apps: Better Auth on Cloudflare Workers, the shared remy-ui package, and where to start."
---

https://github.com/joeblew999/remy-auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers**
with **D1** as the planned identity and session store.

**Status:** the GUI foundation is live on Cloudflare in two apps built on TanStack Start, in
English, Spanish and Arabic, from the shared `@joeblew999/remy-ui` package. Authentication and D1
storage are still planned; open work is listed in [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md).

## Where to look

Two live sites, each with site pages for Google and app pages under `/app`;
[paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js) defines both kinds. Swap `/en` for `/es` or `/ar` anywhere.

| Site | Rendering | Open |
| --- | --- | --- |
| remy-auth | server-rendered on every request | https://remy-auth.gedw99.workers.dev/en |
| remy-auth-app | prerendered static pages | https://remy-auth-app.gedw99.workers.dev/en |

| Kind | Page | remy-auth link |
| --- | --- | --- |
| Site | Home | https://remy-auth.gedw99.workers.dev/en |
| Site | Formats, with settings in the address | https://remy-auth.gedw99.workers.dev/en/formats?currency=JPY&count=11&calendar=islamic |
| Site | A time zone | https://remy-auth.gedw99.workers.dev/en/time-zones/Asia/Tokyo |
| Site | Not found, localized | https://remy-auth.gedw99.workers.dev/ar/time-zones/Mars/Olympus |
| Site | Sitemap (site pages only) | https://remy-auth.gedw99.workers.dev/sitemap.xml |
| App | Home, with the live status card | https://remy-auth.gedw99.workers.dev/en/app |
| App | Demo form: server reply and leave warning | https://remy-auth.gedw99.workers.dev/en/app/demo |
| App | Location: Cloudflare's and your device's | https://remy-auth.gedw99.workers.dev/en/app/location |
| Ops | Liveness | https://remy-auth.gedw99.workers.dev/healthz |

## Get started

Install [mise](https://mise.jdx.dev/getting-started.html), then run from this checkout:

```sh
mise install
mise run project:setup
mise run project:dev
```

Open [localhost:5173/en](http://127.0.0.1:5173/en); switch to Spanish or try the demo.
Setup installs dependencies and skills, registers MCP, then runs build and browser checks.

Setup installs the pinned **Codex CLI**; authenticate when prompted. **Claude Code**
is optional and installed separately.
Install **Google Chrome** before setup; browser checks use the installed Chrome.

## Work with an agent

Starting, resuming and reloading Codex or Claude Code, in VS Code or a terminal, is in
[developer tooling](./tooling.md#start-or-reload-your-agent).

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
See [local/remote commands](./gui.md#one-scaffold-for-local-and-cloudflare)
for deployment and running the same tests against a deployed URL.

Review dependency changes after upgrading. Node is pinned in [mise.toml](https://github.com/joeblew999/remy-auth/blob/main/mise.toml); the
skill-source commits and the shared agent bootstrap tasks live in
[tasks/](./tasks.md), one file per task namespace, which other projects include by git reference.

## Project documentation

- [Agent index](https://github.com/joeblew999/remy-auth/blob/main/AGENTS.md): where agents start.
- [Development principles](./development.md): what the code must be, and how plans work.
- [How we work](./how-we-work.md): how people and agents work.
- [Developer tooling](./tooling.md): mise tasks, skills, MCP and browser tools.
- [GUI runtime workflow](./gui.md): one Worker, local and remote test targets.
- [Shared tasks](./tasks.md): the mise tasks other projects include.
- [Shared UI package](./ui-package.md) and its [changelog](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).
- [Plans](https://github.com/joeblew999/remy-auth/tree/main/.plans): [.plans/now.md](https://github.com/joeblew999/remy-auth/blob/main/.plans/now.md) is the only list of what is open and where it stands.
