# One `remy` command-line tool instead of scattered scripts

Parked 2026-09-26 (owner: "Just close out everything, so we can get back to normal"). Owner, earlier:
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

## End state

The package ships `bin/remy.mjs`; every task in `tasks/` is a TOML one-liner with a `usage` spec (no bash,
no `node -e`, no stdout parsing); wrangler, smol-toml and @playwright/test become declared peers.
Consumers get the behaviour through `npm install`. Later option: include the tasks from
`node_modules/@joeblew999/remy-ui/tasks`, which removes the git `ref` and `project:upgrade-ui` (cost: `npm
ci` must run before the tasks exist). Cost: a non-UI CLI in the UI package (or a second package), and CLI
changes need a package release.
