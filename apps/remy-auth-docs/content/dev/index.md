---
title: "Developers: start here"
description: "For developers building Remy or an app on it: shared authentication for Remy apps, Better Auth on Cloudflare Workers, the shared remy-ui package, and where to start."
---

**For developers** building Remy, or an app on its shared UI package. Using the app? Read the
[product guide](/docs). Calling the API? The [API reference](/reference).

https://github.com/joeblew999/remy-auth

Shared authentication for Remy apps, using **Better Auth on Cloudflare Workers** with **D1** as
the identity and session store, and relationship-based permissions every app gets from the shared
package ([sign-in and permissions](./auth.md)).

**Status:** the GUI foundation is live on Cloudflare in two apps built on TanStack Start, from the
shared `@joeblew999/remy-ui` package. remy-auth signs people in with an emailed code, guards its API
by policy, and decides who may do what by relations, shown in its own notes demo. How another app
learns who is signed in is the next piece; open work is the [issues](https://github.com/joeblew999/remy-auth/issues).

## Where to look

Two live sites, each with site pages for Google and app pages under `/app`;
[paths.ts](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/paths.ts) defines both kinds. Swap `/en` for `/es` or `/ar` anywhere.

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

The machine's `vp` in managed mode, which gives this checkout the Node `.node-version` names (26) and the pnpm
`devEngines` names ([developer tooling](./tooling.md#vite-plus-the-machines-vp-in-managed-mode)), then from this
checkout:

```sh
vp install          # once: the dependencies from pnpm-lock.yaml, and the Git hooks
vp run setup        # the install, the pinned skills (skills-lock.json), the agents' rules, then vp run ready
vp run dev          # http://127.0.0.1:5173/en
```

Open [localhost:5173/en](http://127.0.0.1:5173/en); switch to Spanish or try the demo.

The MCP servers for Claude and Codex are committed (`.mcp.json`, `.codex/config.toml`); the **Codex CLI** runs as
`vpx @openai/codex`, and **Claude Code** is installed separately.
The browser checks use Playwright's own Chromium, which the `browsers` task installs (on Linux, add the font
`fonts-noto-cjk`).

## Work with an agent

Starting, resuming and reloading Codex or Claude Code, in VS Code or a terminal, is in
[developer tooling](./tooling.md#start-or-reload-your-agent).

## Everyday commands

Every command, generated from the command line itself, is on [Commands](./commands.mdx). What you run day to
day, and who runs production and a release, is [the flow](./how-we-work.md#the-flow-the-standard-way-in-plain-sight).
Every task is written out in its package's `vite.config.ts`, and `vp run` lists them with the root's scripts.

Local preview and remote deployment use the same build and Wrangler configuration; deploying is a push, which
Cloudflare builds. See [local/remote commands](./run-and-test.md#one-scaffold-for-local-and-cloudflare)
and [on Cloudflare](./run-and-test.md#on-cloudflare) for deployment and running the same tests against a deployed URL.

Review dependency changes after upgrading. Node is pinned in `.node-version` and `package.json`'s
`engines`, pnpm in `devEngines`, every other version once in `pnpm-workspace.yaml`'s catalog; the skill-source commits are in the package (`packages/remy-cli/src/skills.ts`), which every
app installs ([projects](./projects.md)).

## Project documentation

- [Agents: start here](./agents.md): where agents start; the root `AGENTS.md` and `CLAUDE.md` only point at it.
- [Development principles](./principles.md): what the code must be, and how plans work.
- [How we work](./how-we-work.md): how people and agents work.
- [Developer tooling](./tooling.md): the pinned tools, secrets, agent skills, MCP and browser tools.
- [Run, preview and test the app](./run-and-test.md): one Worker, local and remote test targets, Cloudflare.
- [Projects](./projects.md): the layout every app keeps, a new app, publishing, translations, Cloudflare and plans.
- [Shared UI package](./remy-ui.md) and its [changelog](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/CHANGELOG.md).
- [Plans](https://github.com/joeblew999/remy-auth/issues): one GitHub issue per piece of open work.
