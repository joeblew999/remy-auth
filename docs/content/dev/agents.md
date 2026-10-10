---
title: "Agents: start here"
description: "Where an AI agent starts in this repository: the documents that own the rules, in reading order, the live sites, and the flow every piece of work goes through."
---

**For AI agents** (Claude Code, Codex, any other) working in this repository, and the people driving
them. The rules live in these developer docs, each in the document that owns it; this page is the
reading order. The root `AGENTS.md` and `CLAUDE.md` only point here
([where rules live](./how-we-work.md#where-rules-live)). Read the documents below before changing
anything, and follow them over your own defaults.

Live: the app <https://remy-auth.gedw99.workers.dev> (staging, with the automatic sign-in:
<https://remy-auth-staging.gedw99.workers.dev>); the developer docs <https://remy-auth-docs.gedw99.workers.dev/dev>
(the product guide `/docs`, the API reference `/reference`; MCP servers `/api/mcp/dev`, `/api/mcp/reference`,
`/api/mcp/docs`; everything for AI tools at `/llms.txt`). These pages' source is `docs/content/dev/*.md`:
read those, not the translations beside them (`*.es.md`).

1. [Development principles](./development.md): ownership, single source of truth, test gates,
   generated code, owner decisions.
2. [Developer tooling](./tooling.md): mise tasks, pinned tools and agent skills. Run project
   commands through `mise run <namespace:action>`.
3. [GUI runtime workflow](./gui.md): one Worker, local and remote test targets.
4. [How we work](./how-we-work.md): project tools first, surveys before tool choices, shadcn and
   TanStack all the way for UI, the flow and who runs each step, multi-agent work. Record working
   rules there, not in agent memory.
5. [Sign-in and permissions](./auth.md): the guard, the relation engine, `<Allowed>`, environments
   and mail: what every Remy app gets, and where remy-auth uses each itself.
6. The plan in [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) covering your
   task, and its [Executor/Reviewer roles](./development.md#plans-and-roles).

Start with `mise run dev:status` (what is going on) and
[the project's own tools](./how-we-work.md#use-the-projects-own-tools-first), and finish through
[the flow](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest): `mise run dev:change`
after every change, `mise run dev:land -- "<what changed>"` when the work is finished and the check is
green.
