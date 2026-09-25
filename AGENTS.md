# Agent instructions

This file is an index. The rules live in the documents below; read them before
changing anything, and follow them over your own defaults. Do not copy their content here.

1. [Development principles](docs/development.md) — ownership, single source of truth,
   test gates, generated code, owner decisions.
2. [Developer tooling](docs/tooling.md) — mise tasks, pinned tools and agent skills.
   Run project commands through `mise run <namespace:action>`.
3. [GUI runtime workflow](docs/gui.md) — one Worker, local and remote test targets.
4. [How we work](docs/how-we-work.md) — project tools first, surveys before tool choices,
   shadcn and TanStack all the way for UI, local gates, multi-agent work. Record working rules there, not in agent memory.
5. The plan in [`.plans/`](.plans/) covering your task, and its
   [Executor/Reviewer roles](docs/development.md#plans-and-roles).

Start with [the project's own tools](docs/how-we-work.md#use-the-projects-own-tools-first) and
finish with [the gates](docs/how-we-work.md#gates-before-anything-leaves-the-machine).
