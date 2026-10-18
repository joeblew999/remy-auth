---
title: "Developer tooling reference"
description: "The tools behind the commands: where each area is explained, pinned tools, secrets, agent skills and the Cloudflare services behind the docs. Every command itself is on Commands."
---

## The tooling

The repository is a standard Vite Plus monorepo, as `vp create vite:monorepo` makes one, on pnpm: every project
command is a task written out in its package's `vite.config.ts` or a script in the root `package.json`, run as
`vp run <name>`. Node is pinned by `.node-version` and `package.json`'s `engines`, pnpm by `devEngines` (12.14.0,
which `vp install` downloads and runs). Every version is written once, in `pnpm-workspace.yaml`'s catalog, and each
package lists what it imports (`catalog:`, or `workspace:*` for a package of this repository), with `pnpm-lock.yaml`
beside it; the tools the shared tasks run (Wrangler, Playwright) are `@joeblew999/remy-cli`'s dependencies, so every
app gets the same ones. Tools no task runs (the Chrome DevTools tools, the Modern Web Guidance CLI, the Codex CLI) are
nobody's dependency: each runs as `vpx <name>`. `vp migrate --full` reports nothing to change and `vp env doctor` passes. A new Vite Plus is `vp upgrade <version>`
then `vp migrate`, which re-pins `vite-plus`, the `vite` alias and the `vitest` pin together (never by hand); an app
gets the release's through `remy upgrade`, which runs that version's migrator (`vp dlx --package=vite-plus@<version> vp migrate --no-interactive`, as Vite Plus's guide runs one). `gh` is the machine's, and Claude Code (the translator) is the machine's own, the one the
subscription is logged into. A script that is one tool is written as that tool (`"logs": "wrangler
tail --format json"`); anything with logic is TypeScript, a `remy` command of the package
(`packages/remy-cli/src`, type-checked on every check) or, for what is one app's own, a `scripts/*.ts` of
that app ([the plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/tooling-in-typescript.md)).
`vp env doctor` prints the versions of Node, the package manager and Vite Plus's tools.

### Vite Plus: the machine's `vp`, in managed mode

Vite Plus is one tool, and its command is always `vp`. It is installed in two places, each doing its own job:

| | On the machine (global) | In the repo (local) |
| --- | --- | --- |
| How it gets there | once per machine: `curl -fsSL https://vite.plus \| bash` | the `vite-plus` package in `package.json`, in `node_modules` |
| What it does | picks Node and the package manager: the Node `.node-version` pins (26.10.0), the pnpm `devEngines` pins | the tools: build, lint, format, type check, tests, the task runner |
| Who sets the version | whoever installed it | the repo, so every machine gets the same |

You only type `vp`. The machine's `vp` puts the pinned Node in place, then runs the repo's version of the tools.
Every machine that works on the repo (your Mac, Claude's cloud, GitHub) has both, with the machine's `vp` in
**managed mode**; without it, `node` is whatever the machine happens to have, and nothing says so.

```sh
curl -fsSL https://vite.plus | bash   # once per machine: the global vp (say yes to managing Node)
vp env on                             # managed mode: node follows .node-version
vp env current                        # must say: Version 26.10.0, Source .node-version, Mode managed
vp install                            # the dependencies, on that Node
```

The installer, run without a terminal (as an agent runs it), leaves `vp` in **system-first** mode. In that mode
the pin is silently ignored and every check runs on the machine's Node, so check `vp env current` before
trusting any result.

- **Claude's cloud** machines start empty. The committed `.claude/settings.json` runs the four steps at the
  start of every session there and reports the Node it got, so nobody runs them by hand.
- **Your own machine (a Mac):** you run the four steps once. After that, `node` goes through `vp` in every
  project, not only this one: a project with its own `.node-version` gets that Node; one without gets `vp`'s
  default (the latest LTS) rather than the Node installed before. `vp env default <version>` sets that default.
  The session step in `.claude/settings.json` does nothing there.
- **A checkout made before 17 October 2026** has a `.claude/settings.json` written by the old `remy guard` (it was
  not committed then). Delete it before pulling, or the pull refuses; then `vp install`. The guard and the Claude
  hooks of ours are gone; a `.claude/settings.local.json` they left is the machine's to delete.

Vite Plus's own instructions for agents load in every Claude session from the installed package
(`CLAUDE.md` imports `node_modules/vite-plus/AGENTS.md`), and its docs for the installed version are in
`node_modules/vite-plus/docs`: read those before changing how anything is built, checked or run.

Better Auth runs in remy-auth's own Worker on a D1 database (`DB` in `wrangler.jsonc`), with its
options in `src/auth/options.ts` (both in `apps/remy-auth/`). Its scripts are the app's own, in
`apps/remy-auth/package.json`, and so is the `local` task (`apps/remy-auth/vite.config.ts`, running the app's
`scripts/local.ts`); from the root each is `remy-auth#<name>`:

```sh
vp run remy-auth#auth:generate <name>        # LOCAL: what the options need beyond migrations/, as the next numbered migration
vp run remy-auth#local                       # LOCAL: .dev.vars when missing, migrations/ and migrations-demo/ on Wrangler's local D1 databases, the guard's fixture
curl 'http://127.0.0.1:5173/dev/mail?recipient=you@example.com'   # LOCAL: the sign-in codes captured for an address, from the running Worker
```

The `local` task (which `vp run dev`, `vp run build` and everything after them run first) writes `.dev.vars`, applies the migrations and installs the guard's oRPC v1 fixture (`tests/guard/v1`),
so dev, preview and every check start on the current schema with nothing to remember. `auth:generate`
runs the pinned CLI through `src/auth/cli.ts`, which compares the options with a throwaway SQLite
database built from `migrations/`, so it writes only what is not there yet; change the options, then
generate, never edit Better Auth's tables by hand. To sign in locally: `vp run dev`, open
`/en/app/account` and press one of the seeded people, or enter any address and read its code from the running
Worker's `/dev/mail` (above; it answers 404 anywhere but the local environment). No mail is sent locally: the local environment keeps it in the Worker's outbox instead
(the environment table in `src/auth/environment.ts`, [explained](./auth.md#environments-one-table);
staging, every branch's Preview, has the seeded people too and sends mail for real; any other environment is
production, where mail is sent through Cloudflare Email Service and nobody is seeded). The deployed
databases, their migrations and the `BETTER_AUTH_SECRET` Worker secret are created on the owner's
request only, with Wrangler's own commands, in this order (each changes the Cloudflare account):

```sh
pnpm wrangler d1 create remy-auth                     # then its database_id into wrangler.jsonc, beside "binding": "DB"
pnpm wrangler d1 migrations apply DB --remote         # its tables; every later one, the deploy applies itself
openssl rand -base64 32 | pnpm wrangler secret put BETTER_AUTH_SECRET
pnpm wrangler d1 create remy-auth-demo                # the showcase's notes demo: its database_id beside "binding": "DEMO_DB"
pnpm wrangler d1 migrations apply DEMO_DB --remote
pnpm wrangler email sending list                      # EMAIL_FROM's domain enabled for sending; if not:
pnpm wrangler email sending enable <the address's domain>
```

Every branch's Preview uses the databases in `wrangler.jsonc`'s `previews` section (`remy-auth-preview`,
`remy-auth-demo-preview`), migrated the same way with `--preview`, and its own secret
(`pnpm wrangler preview base-config secret put BETTER_AUTH_SECRET`). `pnpm remy cloudflare provisioned` refuses while
a binding names a database that does not exist, because Wrangler's deploy would otherwise create it by itself.

These are developer/operator tools. Remy end-user CLI login and delegated API calls
remain part of the service milestone. Both apps are live on Cloudflare at the origins in the app's `.env`
(`VITE_DEPLOY_ORIGIN`, `VITE_DOCS_ORIGIN`); a push to `main` deploys them ([on Cloudflare](./run-and-test.md#on-cloudflare)).

### The scripts and commands

Every app has the same tasks and scripts, as `vp create vite:monorepo` lays them out; `vp run` lists them. Vite
Plus decides what runs, in what order, and what a cache makes unnecessary. Each package's tasks are written out in its
own `vite.config.ts` (`apps/remy-auth`, `apps/remy-auth-docs`, `packages/remy-ui`, `packages/remy-cli`, `packages/remy-showcase`; an app's
blank copy in `packages/create/templates/app/`), the repository's checks and `ready` in the root's, and nothing makes a task in code
(owner, 2026-10-17: "in that configuration file of VP, you see everything"). `remyApp()` and `remyDocs()` return Vite's
configuration only, and `@joeblew999/remy-ui/vite-plus` the plain shared settings (`style`, `network`). Each task is
one tool: Vite, Wrangler, Playwright, `vp pack`, `vp test`, `vp check`, Changesets, or a `remy-check` command for the
project's own checks, which no tool does. Nothing of ours runs `vp run`
(a unit check refuses it), and nothing of ours hands a value on through the environment: the root `package.json`'s
scripts (`ci`, `translate`, `release`, `setup`) are each a chain of standard tools, `remy` leaves and Vite Plus tasks
written out in order ([Commands](./commands.mdx) prints each one's steps). Vite Plus's own commands work as they do anywhere:
`vp install`, `vp dev`, `vp check`, `vp test`, `vp build`, `vp preview`, `vp run <name>`, `vp run -r build`.
`vp run --last-details` says why each task ran or came from the cache; a task's inputs, outputs and environment are in
its `cache` settings.

The `remy` and `remy-check` commands are `@joeblew999/remy-cli`'s (`packages/remy-cli/src`, one module each),
released with `@joeblew999/remy-ui` under the same version; in an app they run as `pnpm remy …`, and remy-auth's
tasks run them from source (`node packages/remy-cli/src/remy.ts`). `pnpm remy help` lists every command, one line
each, and a command run without arguments says its own (`pnpm remy docs`). Each does the one job it names; none
wraps git, GitHub or a deploy (owner, 2026-10-18: "No more crazy magic stuff").

Every script and command, with what each does, is on **[Commands](./commands.mdx)**, generated from the
command line itself, so it cannot drift; no page lists them by hand. Where each area is explained:

- The flow and who runs each step: [how we work](./how-we-work.md#the-flow-the-standard-way-in-plain-sight)
- The app, local and remote checks, previews: [the GUI](./run-and-test.md)
- The project layout, a new app, translations, a repository that publishes packages: [projects](./projects.md)
- The docs Worker over an app's `docs/`: [writing docs](./writing-docs.mdx)
- Plans: [plans](./how-we-work.md#plans); translations as a rule: [in the change](./how-we-work.md#translations-in-the-change)
- Agent skills, MCP, screenshots and the agents' own browser: below

### Package upgrades

pnpm's own commands: `pnpm outdated -r` lists what has a newer version (the root and every workspace package),
`pnpm update -r --latest` moves every dependency to its latest version, majors included, and refreshes
`pnpm-lock.yaml`. Every version is in `pnpm-workspace.yaml`'s catalog, so the update rewrites the catalog. Peer
conflicts fail visibly; nothing forces them. Review the manifest and lockfile diff and any major version's migration
notes, then `vp run setup`. Node, pnpm and the skills (`skills-lock.json`) are updated separately.

### Verification

The flow, its steps and who runs each: [how we work](./how-we-work.md#the-flow-the-standard-way-in-plain-sight).

An installation is `vp run setup`: `vp install` (the dependencies against the lockfile), the skills
(`skills experimental_install`, `skills experimental_sync`), the agents' rules (`remy rules`), then `vp run ready`.
`vp env doctor` says whether Node, the package manager and Vite Plus are as they should be. The `wrangler.jsonc`
invariants (preview URLs, smart placement, observability) are the `check:wrangler` check, part of `vp run ready`.
Nothing is provisioned on Cloudflare.

The gate before a push or a release is `vp run ci`, the same here as on GitHub (the push's hook runs it): `vp run ready`, our browser
checks against the production build in local Workers (`vp run test:browser`; every language in a release),
Google's audits (`vp run test:audits`); a release adds a new app on this commit's packages (`vp run new-app`). Nothing is deployed by any of
them: deploying is a push. See [the GUI proof](./run-and-test.md) for scope and commands.


## Start or reload your agent

### VS Code Codex extension

Open this repository in VS Code and use the Codex sidebar. The extension ships its own executable; in a terminal,
`vpx @openai/codex` runs the Codex CLI (it is no dependency of the project).
The [Codex CLI and IDE extension share MCP configuration](https://developers.openai.com/learn/docs-mcp).
The committed `.codex/config.toml` is the project's; trust the project in Codex so that it loads. VS Code's
`.vscode/mcp.json` configures its own MCP client and is not the Codex extension's configuration file.

After changing skills or MCP configuration:

1. Save your work, open the Command Palette (`Cmd+Shift+P` on macOS), and run
   **Developer: Reload Window**.
2. Reopen the Codex sidebar and continue the conversation. Verify that the agent
   can call the newly configured tools; configuration alone does not prove a connection.

`codex resume --last` launches a terminal session; it does not reload the extension.
The installed `code` CLI has no documented reload-window flag, so reloading uses
VS Code's built-in command rather than a shell wrapper that pretends to restart it.

### Terminal agents

After `vp run setup`, use Codex or Claude Code:

```sh
vpx @openai/codex                 # New Codex conversation
vpx @openai/codex resume --last   # Resume latest Codex conversation
claude                                 # New Claude conversation
claude --continue                      # Resume latest Claude conversation in this project
```

To reload skills and MCP configuration, exit the current agent with `/exit`, then
resume it from your terminal as above. Use `/mcp` inside the agent to check the
connection. Authenticate when prompted. Claude Code is installed separately; launching Codex does not require it.


## Agent skills

Skills are the standard [`skills` CLI](https://github.com/vercel-labs/skills)'s (a devDependency), and the committed
`skills-lock.json` is their source of truth: each skill with its source repository, the commit it came from and its
hash. The sources are the libraries' own maintainers: Better Auth, Cloudflare, Chrome DevTools, Modern Web Guidance,
shadcn, Playwright CLI, GitHub release and TanStack Router/Start. TanStack's skills are named one by one, including its
`react-router` skill (the React bindings), which replaced Remix's skill of the same name: skills install flat by name,
so the two cannot coexist. TanStack Form's skills are not installed: they live only on its v2 alpha branches and
describe the 2.0 alpha API, not the 1.x we pin; add them when we move to Form 2.

```sh
pnpm skills experimental_install   # every skill skills-lock.json names, at its commit (vp run setup runs it)
pnpm skills experimental_sync      # the skills installed packages ship, the platform's remy skill among them
pnpm skills add <source>           # one more, recorded in skills-lock.json
pnpm skills list                   # what is installed
pnpm skills remove <name>          # one removed
```

Skills live in `.agents/skills/`; `.claude/skills/` links to the same files. Only `skills-lock.json` is committed;
the installed skills and their Claude links are ignored and recreated by `vp run setup`. Reload an existing agent
session if newly installed skills are not yet visible. [The skills plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/agent-skills.md)
tracks dependencies without an official skill.

### The `remy` skill: the platform's rules for every repo's agents

Beside the pinned skills, `skills experimental_sync` installs `remy` from the installed package
(`./node_modules/@joeblew999/remy-ui/skills`), so its version is the package's: the rules of the
version an app runs, offline. It is every page of these developer docs exactly as the docs Worker serves them to
AI tools (`/dev/llms.txt`, each page's `.md`: includes resolved, components as text), made by `remy skills build`
(the root's `skills:build` task, which the new-app test and the publish run first; never `vp run ready`). So the skill, `llms.txt`, each page's
Markdown and the MCP servers are one text from one source: a page cannot reach one and miss another. The live
docs (`/dev/llms.txt`, `/api/mcp/dev`) always have the newest; the skill says so. In an app, `pnpm remy rules` keeps a marked
block in `AGENTS.md` pointing its agents at the skill and naming the version; `vp run setup` runs it, so an upgrade
(which ends with `vp run setup`) changes the rules the agents read in the same step.
remy-auth's own `AGENTS.md` is a pointer to [Agents: start here](./agents.md).

To add a source, only from the library's own maintainers: `pnpm skills add <owner>/<repo>` (naming the skills to take
with `--skill` when the repository also ships contributor-only skills), then commit the changed `skills-lock.json`.


## MCP registration

Skills provide instructions and workflows; MCP provides callable tools. Chrome
DevTools uses both. Modern Web Guidance uses its CLI, and many auth/Cloudflare
skills also work through the existing CLIs; a skill does not automatically require
an MCP server.

The registration is committed, one file per client: `.mcp.json` (Claude) and `.codex/config.toml` (Codex), each
naming one server, `chrome-devtools`, run as `vpx chrome-devtools-mcp@1.10.1 --isolated --headless
--no-usage-statistics --no-performance-crux`: the pinned version, an isolated headless Chrome profile, tool telemetry
and CrUX uploads off. Nothing writes them; change the version there, by hand, in both. The MCP process is separate
from the `chrome-devtools start`/`stop` session below; the agent client manages its lifetime.

Reload the agent after a change. Codex only loads project configuration in a
trusted project. Claude may show **Pending approval** for a new project MCP server;
review it in Claude's `/mcp` interface. The files do not bypass client trust or
approval settings. See [Codex MCP configuration](https://developers.openai.com/codex/mcp)
and [Claude MCP scopes](https://code.claude.com/docs/en/mcp). `claude mcp list` and `codex mcp list` show what each
client has registered (Claude also checks connectivity for approved servers).


## Browser tooling

Google's [Chrome DevTools agent tools](https://developer.chrome.com/docs/devtools/agents)
provide browser interaction, screenshots, accessibility inspection, network/cookie
debugging, Lighthouse and performance analysis. Install Google Chrome separately;
the browser is not installed by project setup. The CLI (`chrome-devtools`, from the `chrome-devtools-mcp` package)
is experimental and no dependency of the project; it runs through `vpx`, at the MCP server's version:

```sh
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools start --isolated --usageStatistics=false --performanceCrux=false
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools new_page http://localhost:5173/en
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools list_pages
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools take_snapshot 1              # Use the returned page ID
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools click 1 "UID_FROM_SNAPSHOT"
vp dlx -p chrome-devtools-mcp@1.10.1 chrome-devtools stop
```

`start` is headless by default; add `--headless=false` for a visible window. Start once
per session; subsequent CLI calls reuse the background daemon. Starting again
restarts that daemon. `--isolated` gives the session a temporary Chrome profile; the two `false` flags
turn off tool usage telemetry and CrUX URL uploads. Stop the session when finished.
`chrome-devtools --help` lists the upstream commands.


## Modern web implementation guidance

Google's [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance)
complements browser inspection with implementation guidance for native HTML/CSS,
forms, accessibility, performance, passkeys and browser compatibility. The main
`modern-web-guidance` skill is installed for both agents. The separate
`chrome-extensions` skill is omitted because this project is a web service and UI.

```sh
vpx modern-web-guidance search "animate a dialog modal backdrop"
vpx modern-web-guidance retrieve "GUIDE_ID_FROM_SEARCH"
vpx modern-web-guidance list
```

The CLI is no dependency of the project; `skills experimental_install` restores the commit-pinned skill. If a search
returns no matches, use `list` to browse guide IDs. Browser support defaults to the skill's **Baseline Widely
available** policy, with fallbacks for newer features.


## Cloudflare observability

The [observability plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/observability.md) covers logs, traces, metrics,
D1 health, durable auth audit records, correlation, dashboards and alerts.
`wrangler.jsonc` enables logs/traces and URL query redaction for the GUI Worker.
A GUI Worker entry now emits request IDs, status and timing without logging URLs,
headers or cookies. Sign-in's durable audit records are not implemented.

```sh
pnpm wrangler tail --format json -- --help
pnpm wrangler tail --format json --status error -- --help
```

Both use the configured Worker; `pnpm wrangler tail --format json` also accepts an explicit Worker name.
`pnpm wrangler tail --format json --status error` filters Worker invocation failures, not all HTTP error responses. Durable audit
storage, dashboards and alert delivery are open work in the observability plan.

### The docs answers on Cloudflare: AI Search and AI Gateway

Two Cloudflare products sit behind the docs' Ask AI (the docs Worker), and they are easy to mix up:

- **AI Search** is the index (`remy-docs-pages`, remy-auth's; every name here is `docs.config.ts`'s
  `ask`). It reads the docs itself from the R2 bucket `remy-docs` (one Markdown file per docs page and language, `<site>/<lang>/<page>.md`, synced every
  15 minutes),
  finds the passages that match a question, and asks a Workers AI model to write the answer.
- **R2** holds the files AI Search reads. The docs Worker makes the bucket hold exactly the docs pages, on the
  first request after each new version (remy-ui's `docs/publish.server.ts`, through its `DOCS_PAGES` binding, so no
  token): it puts each one, marked with the version, and deletes anything else, so a removed page leaves the answers
  too.
- **AI Gateway** is the meter in front of the model. Every model call AI Search makes passes through
  it (`remy-docs`), and it logs each one with its cost, tokens and time (and the question). It holds
  no docs. Spend limits and rate limits live here; `pnpm remy docs observe ai-usage` and `ai-check` read it.

Local or remote: the docs pages, the Ask AI page and all checks run locally; answering
exist only on Cloudflare (AI Search has no local version). Every command says in its header comment
whether it is local or remote (and production).

The docs' commands (`pnpm remy docs …`: publish, questions, answers, observe) are on [Commands](./commands.mdx).
Two things that list cannot say: the `observe` commands need the gateway's token, so run them as
`fnox exec -- pnpm remy docs observe …`; and `CLOUDFLARE_ENV=ask vp -C apps/remy-auth-docs dev` (an app's:
`vp -C docs dev`) runs the local docs Worker with answers from the live index (its `wrangler.jsonc`'s `env.ask`).
Every deploy of the docs gives the index the new pages by itself, within the next sync (15 minutes).

Tokens: see [secrets](#secrets-fnox) below.

Costs: indexing is a few embeddings (a full reindex about $0.0005); a search without an answer next to
nothing; an answer about $0.0001 to $0.0007, and $0 when AI Search's cache has it.

Ask AI is each app's choice: `docs.config.ts`'s `ask` names its AI Search instance, R2 bucket, AI Gateway
and rate-limit namespace, and the docs Worker's own `wrangler.jsonc` declares the same instance and rate limit as
its bindings (`ai_search`, `ratelimits`). Without `ask` the docs have no Ask AI page or button, and their
`wrangler.jsonc` no such bindings (the blank app's has none).
`pnpm remy docs provision` prints the commands that create an app's resources and creates nothing:
that costs money and is the owner's.

Stored history and the AI answers, read only, from Cloudflare's own APIs. The Worker, its AI Search
instance and that instance's AI Gateway come from its Wrangler configuration, so an including app gets its own:

The `observe` commands (on [Commands](./commands.mdx)) read the AI Gateway; run them as
`fnox exec -- pnpm remy observe …`, for the token. A Worker's logs are Wrangler's (`pnpm wrangler tail`, live) or the
Cloudflare dashboard's Observability.

### Secrets: fnox

Wrangler's login covers deploys, AI Search and Worker secrets, but cannot be granted AI Gateway or
Workers Logs access. For those, the commands read tokens from the environment:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: the shared Cloudflare token and account, the
  same keychain items in every joeblew999 repo. [`fnox.toml`](https://github.com/joeblew999/remy-auth/blob/main/fnox.toml) names them (values stay
  in the macOS keychain, never in the file); `fnox` is the machine's. Run a command with them:
  `fnox exec -- pnpm remy observe ai-usage`. Set one with `fnox set -p keychain CLOUDFLARE_API_TOKEN <token>` (never
  omit `-p keychain`: without it the value is written to `fnox.toml` in plain text). It reads Workers Logs
  and AI Gateway, so it needs **Workers Observability Read** and **AI Gateway Edit**; AI Search is read
  with Wrangler's login.
One token does it all (the `dev` token at <https://dash.cloudflare.com/profile/api-tokens>): **AI Gateway
Edit** (which includes reading) and **Workers Observability Read** are the ones these commands need; changing
the gateway with `observe gateway` uses the same token, and every change is read back.
