---
title: "Agents: start here"
description: "Where an AI agent starts in this repository: the documents that own the rules, in reading order, the live sites, and the flow every piece of work goes through."
---

**For AI agents** (Claude Code, Codex, any other) working in this repository, and the people driving
them. The rules live in these developer docs, each in the document that owns it; this page is the
reading order. The root `AGENTS.md` and `CLAUDE.md` only point here
([where rules live](./how-we-work.md#where-rules-live)). Read the documents below before changing
anything, and follow them over your own defaults.

When two pages disagree, [the flow's table](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest)
wins, and the page that disagrees is a bug: fix it in the landing you are on
([see something: fix it](./how-we-work.md#see-something-fix-it-or-write-it-down-in-the-same-landing)).
A contradiction between pages is never a reason to stop, or to ask the owner which is right.

Live: the app <https://remy-auth.gedw99.workers.dev> (staging, with the automatic sign-in:
<https://remy-auth-staging.gedw99.workers.dev>); the developer docs <https://remy-auth-docs.gedw99.workers.dev/dev>
(the product guide `/docs`, the API reference `/reference`; MCP servers `/api/mcp/dev`, `/api/mcp/reference`,
`/api/mcp/docs`; everything for AI tools at `/llms.txt`). These pages' source is `apps/docs/content/dev/*.md`:
read those, not the translations beside them (`*.es.md`).

1. [Development principles](./principles.md): ownership, single source of truth, test gates,
   generated code, owner decisions.
2. [Developer tooling](./tooling.md): pinned tools and agent skills; every command is on
   [Commands](./commands.mdx), generated from the command line. Run project commands through `vp run <name>` (a task or a script).
3. [Run, preview and test the app](./run-and-test.md): one Worker, local and remote test targets, Cloudflare.
4. [How we work](./how-we-work.md): project tools first, surveys before tool choices, shadcn and
   TanStack all the way for UI, the flow and who runs each step, multi-agent work. Record working
   rules there, not in agent memory.
5. [Sign-in and permissions](./auth.md): the guard, the relation engine, `<Allowed>`, environments
   and mail: what every Remy app gets, and where remy-auth uses each itself.
6. The plan in [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) covering your
   task, and its [Executor/Reviewer roles](./principles.md#plans-and-roles).

Start with `vp run status` (what is going on) and
[the project's own tools](./how-we-work.md#use-the-projects-own-tools-first), and finish through
[the flow](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest): `vp run check`
after every change, `vp run land "<what changed>"` when the work is finished and the check is
green.

## Working from Claude's cloud

An agent in Claude's cloud (Claude on the web or the phone) has no Cloudflare token: `wrangler` and the
`npx remy cloudflare` deploys cannot sign in there, and `vp run land` says it skipped staging, which is not a
failure. It has the **Cloudflare connector** instead, used by hand; nothing in the repository depends on it.
How to preview a branch from there, and what lives on Cloudflare rather than in the repository:
[On Cloudflare](./run-and-test.md#on-cloudflare).
