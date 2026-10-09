# The tooling in TypeScript, type-checked wherever it runs

Reopened 2026-10-09 as [issue #9](https://github.com/joeblew999/remy-auth/issues/9) (owner: "Claude eats
TypeScript for breakfast thanks to oRPC and TanStack so I might drop the mise later and only use it to
load the tools ... The current node to script layer is getting missed by Claude because it's not type
safe"). The same day: "The fucking thing is going to be used on all apps, including the tooling."

## Done 2026-10-09: the task layer is TypeScript, checked wherever the tasks are

- Node 26 runs a `.ts` file as it is, so a task script is TypeScript with no build step.
- `tasks/tsconfig.json` is the shared tasks' own TypeScript project (strict, `erasableSyntaxOnly`), and
  `project:typecheck-tasks`, a file task that knows its own folder, checks it with the app's `tsc`: in
  this repository, and in a consumer from mise's cache of the include. `project:typecheck` runs it, so
  `project:check` (every change, ~6 s) fails on a task that no longer compiles instead of the deploy.
- Converted first: what every deploy depends on, `cf/wait.ts` and `cf/provisioned.ts`.
- What stays to convert, in the order a wrong one costs most: `cf/versions`, `cf/urls`, `api/spec`
  (node scripts, rename and type), then the `.mjs` modules behind bash wrappers (`plans/plans.mjs`,
  `cf/observe.mjs`, `project/verify-tooling.mjs`, `browser/shots.mjs`, `cf/gateway.mjs`,
  `mcp/register.mjs`, `agents/rules.mjs`, `packages/workspaces.mjs`, `project/single-copies.mjs`,
  `docs/provision.mjs`): each becomes a `.ts` file task of its own, and its wrapper goes.
- The bash that stays is glue around one tool (`cf/deploy`, `cf/preview`, `packages/*`): it is where
  mise's own features (`depends`, `env`, `sources`/`outputs`, `usage`) replace lines, not TypeScript.

The owner's direction for mise, from #9: it stays the loader of pinned tools and the runner of
one-line tasks; the logic moves to TypeScript. That is this plan. Parked 2026-09-26 (owner: "Just close out everything, so we can get back to normal"). Owner, earlier:
"Some mise tasks are dependent on scripts. I like mise tasks to be simple ... It's worth asking if we
could get rid of scripts if the code or code structure was different, or if we used a tool."

## Inventory (read-only, 2026-09-26): about 1,350 lines outside one-line `run`s

| Verdict | Items | Lines |
| --- | --- | --- |
| Move to a package CLI (`remy` bin in @joeblew999/remy-ui, `node:util` parseArgs, no deps) | browser:shots, cf:events/ai-*, cf:ai-gateway, cf:preview(+delete), cf:urls, cf:wait, i18n:*, plans:* | ~960 (71%) |
| Restructure | docs-publish (sync or a crawl source), docs-questions (a data-driven test), mcp:register (upstream `claude mcp add`), project:test:cwv (stdout parsing becomes a CLI flag) | ~150 |
| Fold into plain mise | release-notes, release.sh (CI already publishes from the tag), api:spec (curl + jq), cf:deploy (usage flag), project:upgrade-ui | ~130 |
| Keep | verify-tooling (trimmed: npm already refuses a mismatched lock), paraglide.mjs, three one-liners | ~110 |

The 13 bash wrappers (`exec node "$(dirname "$0")/x.mjs"`) are not needed for ESM, as their comment says:
cf/wait, cf/urls and api/spec already run as node file tasks. They exist because several tasks share
one module and a TOML task cannot find a sibling file in mise's include cache; a CLI removes both.

Translations: the i18n tasks are not to move into the CLI by default; [translation-pipeline](translation-pipeline.md)
looks for upstream tools that replace them first.

## End state

The package ships `bin/remy.mjs`; every task in `tasks/` is a TOML one-liner with a `usage` spec (no bash,
no `node -e`, no stdout parsing); wrangler, smol-toml and @playwright/test become declared peers.
Consumers get the behaviour through `npm install`. Later option: include the tasks from
`node_modules/@joeblew999/remy-ui/tasks`, which removes the git `ref` and `project:upgrade-ui` (cost: `npm
ci` must run before the tasks exist). Cost: a non-UI CLI in the UI package (or a second package), and CLI
changes need a package release.
