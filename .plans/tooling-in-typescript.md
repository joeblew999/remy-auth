# No mise: package.json is the entry, and the tooling is one TypeScript command line

Owner, 2026-10-11, after a day in which the flow's gate refused `project:setup`, a release alias and
a `grep`, and 122 runnable tasks needed three mechanisms and 4,200 lines of docs to say who runs
which: "fuck this. strip away mise so that its all typescript", then "use the package.json as the
entry point like all typescript projects do". The same direction two days earlier, in
[issue #9](https://github.com/joeblew999/remy-auth/issues/9): "Claude eats TypeScript for breakfast
thanks to oRPC and TanStack so I might drop the mise later ... The current node to script layer is
getting missed by Claude because it's not type safe."

## The decision

- **`package.json` scripts are the entry, and the only one.** `npm run dev:change`,
  `npm run dev:land -- "<what changed>"`, `npm run dev`: about fifteen scripts, the flow's seven and
  the hand tools a person uses (the app, a preview, screenshots, logs, what is deployed). Nothing else
  is a command; what is not a script is a function the steps call.
- **The tooling is `remy`,** the bin of `@joeblew999/remy-ui` (`packages/ui/src/cli/`): TypeScript,
  type-checked by the app's `tsc` on every check. remy-auth runs the source; an app runs the
  JavaScript emitted from it (`packages/ui/cli`, by `ui:generate` and `prepack`), because Node strips
  types from nothing under `node_modules` (GitHub's consumer job found it on the first landing). A consumer's `package.json` says
  `"dev:change": "remy change"` and gets the tooling with `npm install`, at the package's version: the
  git-ref include of `tasks/`, `project:upgrade-ui`'s ref dance and mise's include cache go.
- **An app says once, in `remy.config.ts`,** where it is deployed and its ports (`defineRemyProject`).
  A worktree's ports are computed from its name, so nothing local is written for them.
- **Pins:** Node by `engines` and `.node-version`; every tool a devDependency (wrangler, Playwright,
  TypeScript, Claude Code for the translator); `gh` stays the machine's, as it is today.
- **The gate stays only inside what costs money or ships** (a deploy, a publish). The agent hook's
  regex and the unit check that reads the docs for bare commands go with the surface they police.
- **The docs describe the scripts,** not tasks: every `mise run` line leaves them with the slice that
  retires its task; `tasks.md` becomes the CLI's page.

Why one package and not a second: the owner calls remy-ui "the platform's one dependency set", and a
CLI with no UI import costs its consumers nothing; a second package is a second version to pin.
Why scripts and not a `remy` a person types: `npm run` is what every TypeScript developer and agent
already does, and the scripts list is the documentation of what exists.

## Slices, one landing each

1. **Done 2026-10-11, the flow.** `tasks/dev/*.ts` moved to `packages/ui/src/cli/` as the bin's
   commands (`remy status|start|change|land|promote|release|done|guard|guard-hook|allowed`), the
   seven `dev:*` scripts in `package.json` and the template's, `remy.config.ts` with the origins and
   ports (`config.ts` hands them to the tasks as the environment they read), the hooks registered as
   the checkout's own bin, the mise `dev:*` tasks one-line forwards to the package's source (not the
   bin link: the main checkout's install can be behind the lock, so `remy land` brings it up to date
   before the translation runs there). What the steps still run
   through mise goes through `internal.ts`, one call per task: `project:check`, `project:prepare`,
   `cf:staging`, `cf:deploy`, `docs:deploy`, `cf:versions`, `i18n:check`, `i18n:translate`,
   `packages:release`. Each later slice deletes one of those calls.
2. **The check** (`project:check`), as functions of `remy change` (`check.ts`), part by part:
   plans and single copies (done 2026-10-11: `plans.ts`, `remy plans` as the hand tool, the two
   `.mjs` gone); then routes, types, the unit checks, the translation status, the docs build;
   `project:verify-setup` with them, as `remy setup`'s end.
3. **Cloudflare:** `cf:deploy`, `cf:staging`, `cf:wait`, `cf:versions`, `cf:urls`, `cf:preview`,
   the provisioned check; `remy promote` and `remy land` call functions.
4. **Translations:** `i18n:check` and `i18n:translate` (the writer's lock, the page rules already in
   `tasks/i18n/docs/page.ts`), with Claude Code as a devDependency; the detached translation the
   flow's open gap asks for comes with it.
5. **The rest of the namespaces:** `docs:*`, `packages:*`, `ui:*`, `template:*`, `skills:*`, `mcp:*`,
   `agents:*`, `plans:*`, `browser:*`, `api:*`, and remy-auth's own `auth:*` in its `package.json`.
6. **GitHub and the consumers:** the workflow on `actions/setup-node` and `npm run`; the template
   and remy-auth-app on the scripts (`project:upgrade-ui` becomes `npm install @joeblew999/remy-ui@x`).
7. **Delete mise:** `mise.toml`, `tasks/`, `mise.local.toml`, `template/mise.toml`, `mise.dev.toml`;
   the docs without a `mise run` in them; the hook regex and the doc check go.

What is measured as each slice lands: the scripts a person can run (`npm run`, nothing else), the lines
of bash and `.mjs` left (417 and 662 on 2026-10-11), and the `mise run` lines left in the docs.

## Was: the task layer in TypeScript under mise (2026-10-09, superseded)

Node 26 runs a `.ts` file as it is; the shared tasks got a TypeScript project of their own
(`tasks/tsconfig.json`, checked by `project:typecheck-tasks`) and the flow, `cf/wait`,
`cf/provisioned` and `verify-tooling` were converted. The direction then was that mise stays the
loader of pinned tools and the runner of one-line tasks, with the logic in TypeScript; the inventory
of 2026-09-26 (about 1,350 lines outside one-line `run`s, 71% of it bound for a package CLI) and the
end state it named (`bin/remy`, every task a TOML one-liner) are what the decision above finishes
without the TOML.
