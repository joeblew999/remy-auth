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
`/api/mcp/docs`; everything for AI tools at `/llms.txt`). These pages' source is `docs/content/dev/*.md`:
read those, not the translations beside them (`*.es.md`).

1. [Development principles](./development.md): ownership, single source of truth, test gates,
   generated code, owner decisions.
2. [Developer tooling](./tooling.md): the scripts and commands, pinned tools and agent skills. Run
   project commands through `npm run <script>`.
3. [GUI runtime workflow](./gui.md): one Worker, local and remote test targets.
4. [How we work](./how-we-work.md): project tools first, surveys before tool choices, shadcn and
   TanStack all the way for UI, the flow and who runs each step, multi-agent work. Record working
   rules there, not in agent memory.
5. [Sign-in and permissions](./auth.md): the guard, the relation engine, `<Allowed>`, environments
   and mail: what every Remy app gets, and where remy-auth uses each itself.
6. The plan in [`.plans/`](https://github.com/joeblew999/remy-auth/tree/main/.plans) covering your
   task, and its [Executor/Reviewer roles](./development.md#plans-and-roles).

Start with `npm run dev:status` (what is going on) and
[the project's own tools](./how-we-work.md#use-the-projects-own-tools-first), and finish through
[the flow](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest): `npm run dev:change`
after every change, `npm run dev:land -- "<what changed>"` when the work is finished and the check is
green.

## Working from Claude's cloud

An agent in Claude's cloud (Claude on the web or the phone) has no Cloudflare token: `wrangler`,
`npx remy cloudflare preview`, `staging` and `deploy` cannot sign in there; `dev:land` lands through the pull
request as anywhere and says it skipped staging (no Cloudflare sign-in), which is not a failure. It has the **Cloudflare connector** instead (the app's Cloudflare tools, signed in as the
owner), which an agent uses by hand; nothing in the repository depends on it.

- **A preview of the work, from the cloud**: push the branch, with no pull request (`git push -u origin
  <branch>`; GitHub runs nothing for a branch without one). Cloudflare's Workers Builds builds it and serves
  it at `https://<branch>-remy-auth.gedw99.workers.dev`; the connector's builds tools show the build and its
  log. Then check it: `REMY_FLOW=hand npm run test -- remote https://<branch>-remy-auth.gedw99.workers.dev`
  (our checks only: a preview is hidden from search engines on purpose, so Google's audits judge production).
  Proven on 2026-10-17: the branch `claude/cloud-previews` built on Cloudflare in about a minute and passed.
- **Cloudflare's build settings** live on Cloudflare, not in the repository, so they are written here and
  changed only through the connector, to match: two build rules on the `remy-auth` Worker, both
  `npm run build`, `NODE_VERSION` as in `.node-version`. `main`: deploy `npx wrangler versions upload` (a
  new version; production moves only with `dev:promote`). Every other branch: deploy `npx wrangler preview`.
  On 2026-10-17 the branches rule was missing, so no branch got a preview although these docs said so;
  it was added through the connector.
- **Production, staging and the `npx remy cloudflare …` commands** run on the owner's Mac, which has the
  token.
