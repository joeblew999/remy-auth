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
   `.mjs` gone); the translation checks (done 2026-10-11: `i18n.ts`, `remy i18n check`, the two bash
   scripts, `jq`, `@lingual/i18n-check` and `plurals.mjs` gone; the land and status steps ask a
   function); routes, types, the unit checks and the docs (done 2026-10-11: tool runs behind a stamp
   under `node_modules/.cache/remy` where mise skipped unchanged sources; the app's generation step is
   its `package.json` "generate" script, run if present). `remy change` runs no mise task now;
   `project:verify-setup` with them, as `remy setup`'s end.
3. **Cloudflare** (done 2026-10-11, `cloudflare.ts`): the deploy (build, the provisioned check,
   upload, the wait for the version and the assets, the live smoke), the docs Worker's deploy, what
   each deployment runs, the page URLs; `remy promote` and `remy status` call the functions, `remy land`
   runs the staging deploy as a child so a failure there still lets the landing finish; `cf:preview`
   calls the bin for its two helpers until its own slice.
4. **Translations** (done 2026-10-11, `translate.ts`, `page.ts`, `prompts.ts`): the one writer's guard
   and lock, the headless agent call with its timing line, the messages and docs translators with
   their merge and accept rules; `remy land` runs it as a child on main. Claude Code is the machine's
   own, the one the subscription is logged into (not a devDependency: it is a developer-machine step,
   and the login lives there); the task had pinned 2.1.282, the machine has 2.1.296. The detached
   translation the flow's open gap asks for is still to do, on this code.
5. **The rest of the namespaces.** Done 2026-10-11, the installation and the verification
   (`setup.ts`, `verify.ts`, `skills.ts` with the pins as data, `mcp.ts` pointing the agent clients at
   the app's own `chrome-devtools-mcp`, `rules.ts` in the npm wording): `npm run setup`, `remy verify
   [setup|tooling|doctor]`, `remy skills`, `remy mcp`, `remy rules`. The same day, `packages:*` and
   the release (`packages.ts`: `remy packages check|upgrade|pack|notes|bumped|publish|tag|release`,
   `remy release` on it; the release package and title in `remy.config.ts`; an app's own release
   checks are its "release-checks" script). The same day, the checks and the hand tools (`test.ts`:
   `remy test` with every level, the throwaway preview and the speed measurement in `cloudflare.ts`;
   `dev.ts`: `remy app dev|build|preview`; an app's local state is its "local" script, remy-auth's
   `scripts/local.ts`; `npm run dev|build|preview|test`). The steps run no mise task now. 5d, done 2026-10-11: `docs.ts` (`remy docs dev|build|check|test
   [remote]|preview|answers on|off|publish|provision|init|observe …`), `observe.ts` (events, AI usage,
   the AI check, the gateway; `fnox exec --` in front where the API token is needed), `shots.ts`,
   `api.ts`; the one-line tools are scripts (`npm run logs|errors|wrangler|browser|web|codex|claude`).
   5e, done 2026-10-11: remy-auth's own tasks are its scripts (`npm run auth|auth:info|auth:generate|
   auth:migrate|auth:mail|auth:provision|docs:cli|ui:components|ui:blocks|ui:theme|ui:verify|ui:version|
   template:check|release-checks`, the logic in `scripts/*.ts`), `remy upgrade <version>` for an app;
   `mise.toml`'s own tasks forward to the scripts. Left of 5: `project:refresh-tasks`, which goes with
   the include in 7.
6. **GitHub and the consumers** (done 2026-10-11, proven by the run on its own landing): the shared workflow on `actions/setup-node` (`.node-version`, the
   node pin from `mise.toml`) and `npm run`: `npm run check -- types`, `npm run check -- unit`, the
   matrix as `npm run test -- <level>`, the release job as `npm run packages -- publish --release`;
   `template/mise.toml` goes, the template's `AGENTS.md` names `remy rules`; the consumer fixture runs
   the blank app through its scripts (install, `npx remy skills install` with its cache, `verify
   tooling`, `dev:change`, `test -- quick`, the docs test, `packages publish --dry-run`); remy-auth-app
   moves with the release that carries all this (`npm install @joeblew999/remy-ui@<version>`, its
   scripts, its `remy.config.ts`), which is item 2's release.
7. **Delete mise.** 7a, done 2026-10-11: the docs without mise in them (every page read, `tooling.md`
   and `tasks.md` rewritten around the scripts and `remy`; the owner's quotes stay as said). 7b, left:
   `mise.toml`, `tasks/` (the forwards), `mise.dev.toml`, the worktree's `mise.local.toml`, the mise
   spellings in the guard and the gate, `internal.ts`, the unit check that scans the tasks.

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
