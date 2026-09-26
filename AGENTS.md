# Agent instructions

This file is an index. The rules live in the documents below; read them before
changing anything, and follow them over your own defaults. Do not copy their content here.

Live: the app https://remy-auth.gedw99.workers.dev; the developer docs https://remy-auth-docs.gedw99.workers.dev/dev
(the guide `/docs`, the API reference `/reference`). The documents below are the English developer docs'
source, `docs/content/dev/*.md`: read those, not the translations beside them (`*.es.md`).

1. [Development principles](docs/content/dev/development.md) — ownership, single source of truth,
   test gates, generated code, owner decisions.
2. [Developer tooling](docs/content/dev/tooling.md) — mise tasks, pinned tools and agent skills.
   Run project commands through `mise run <namespace:action>`.
3. [GUI runtime workflow](docs/content/dev/gui.md) — one Worker, local and remote test targets.
4. [How we work](docs/content/dev/how-we-work.md) — project tools first, surveys before tool choices,
   shadcn and TanStack all the way for UI, local gates, multi-agent work. Record working rules there, not in agent memory.
5. The plan in [`.plans/`](.plans/) covering your task, and its
   [Executor/Reviewer roles](docs/content/dev/development.md#plans-and-roles).

Start with [the project's own tools](docs/content/dev/how-we-work.md#use-the-projects-own-tools-first) and
finish with [the gates](docs/content/dev/how-we-work.md#gates-before-anything-leaves-the-machine).
