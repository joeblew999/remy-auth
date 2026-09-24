# Agent instructions

This file is an index. The rules live in the documents below; read them before
changing anything, and follow them over your own defaults. Do not copy their content here.

1. [Development principles](docs/development.md) — ownership, single source of truth,
   test gates, generated code, owner decisions.
2. [Developer tooling](docs/tooling.md) — mise tasks, pinned tools and agent skills.
   Run project commands through `mise run <namespace:action>`.
3. [GUI runtime workflow](docs/gui.md) — one Worker, local and remote test targets.
4. The plan in [`.plans/`](.plans/) covering your task, and its Executor/Reviewer roles.

Before reporting work as done, run `mise run project:verify` and report its real result.
