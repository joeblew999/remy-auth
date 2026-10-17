---
title: "Developer tooling reference"
description: "The tools behind the commands: where each area is explained, pinned tools, secrets, agent skills and the Cloudflare services behind the docs. Every command itself is on Commands."
---

## The tooling

```sh
npm run                   # every script, with what it runs
npm run setup             # the pinned skills, MCP, the flow's guard, the installation's checks
npm run auth -- --help    # the Better Auth CLI
npm run wrangler -- --help
npm run auth:info
```

`package.json` is the entry, as in every TypeScript project: its scripts run every project command.
Node is pinned by `.node-version` and `package.json`'s `engines`; every tool is a dependency of
`@joeblew999/remy-ui`, so every app that installs the package gets the same versions with no pin of its
own: Wrangler, Playwright, TypeScript, the Chrome DevTools tools, the Modern Web Guidance CLI, the
Codex CLI. `gh` is the machine's, and Claude Code (the translator) is the machine's own, the one the
subscription is logged into. A script that is one tool is written as that tool (`"logs": "wrangler
tail --format json"`); anything with logic is TypeScript, a `remy` command of the package
(`packages/ui/src/cli`, type-checked on every check) or, for what is one app's own, a `scripts/*.ts` of
that app ([the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/tooling-in-typescript.md)).
`npx remy verify doctor` prints the versions of the CLIs the tooling runs.

Better Auth runs in remy-auth's own Worker on a D1 database (`DB` in `wrangler.jsonc`), with its
options in `src/auth/options.ts`. Its scripts are remy-auth's own, in `package.json`:

```sh
npm run auth:generate -- <name>        # LOCAL: what the options need beyond migrations/, as the next numbered migration
npm run auth:migrate                   # LOCAL: apply migrations/ and migrations-demo/ to Wrangler's local D1 databases
npm run local                          # LOCAL: .dev.vars when missing, the migrations, the guard's fixture (dev, build and start run it)
npm run auth:mail -- you@example.com   # LOCAL: the sign-in codes captured for an address, from the running Worker
npm run auth:provision                 # Prints what the deployed sign-in needs on Cloudflare; creates nothing
```

`npm run local` (the app's "local" script, which `npm run dev`, `npm run build` and `dev:start` run
first) writes `.dev.vars`, applies the migrations and installs the guard's oRPC v1 fixture (`tests/guard/v1`),
so dev, preview and every check start on the current schema with nothing to remember. `auth:generate`
runs the pinned CLI through `src/auth/cli.ts`, which compares the options with a throwaway SQLite
database built from `migrations/`, so it writes only what is not there yet; change the options, then
generate, never edit Better Auth's tables by hand. To sign in locally: `npm run dev`, open
`/en/app/account` and press one of the seeded people, or enter any address and read its code with
`auth:mail`. No mail is sent locally: the local environment keeps it in the Worker's outbox instead
(the environment table in `src/auth/environment.ts`, [explained](./auth.md#environments-one-table);
staging has the seeded people too and sends mail for real; any other environment is production,
where mail is sent through Cloudflare Email Service and nobody is seeded). The deployed
database, its migrations and the `BETTER_AUTH_SECRET` Worker secret are created on the owner's
request only: `auth:provision` prints the steps, and until the database exists the deploy refuses,
because Wrangler would otherwise create it by itself.

These are developer/operator tools. Remy end-user CLI login and delegated API calls
remain part of the service milestone. Both apps are live on Cloudflare; the production deploy uploads to
`origins.production` in [remy.config.ts](https://github.com/joeblew999/remy-auth/blob/main/remy.config.ts), and `dev:promote` runs it, on the owner's request only.

### Package upgrades

```sh
npm run packages -- check            # Preview available updates
npm run packages -- upgrade          # Apply latest versions, including majors, then the installation's checks
```

### The scripts and commands

Every app on the package has the same scripts; `npm run` lists them. The flow and the hand tools are
scripts; the rest are `remy` commands (`npx remy <command>`), one module each in `packages/ui/src/cli`:
`npx remy help` lists every command, one line each, and a command run without arguments says its own
(`npx remy docs`). The flow is one of them, `remy flow <step>`, which the `dev:<step>` scripts call.

Every script and command, with what each does, is on **[Commands](./commands.mdx)**, generated from the
command line itself, so it cannot drift; no page lists them by hand. Where each area is explained:

- The flow and who runs each step: [how we work](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest)
- The app, local and remote checks, previews: [the GUI](./gui.md)
- Deployments, translations, a repository that publishes packages: [the command line](./tasks.md)
- The docs Worker over an app's `docs/`: [writing docs](./writing-docs.mdx)
- Plans: [plans](./how-we-work.md#plans-few-short-closed); translations as a rule: [in the change](./how-we-work.md#translations-in-the-change)
- Agent skills, MCP, screenshots and the agents' own browser: below

`npm run packages -- upgrade` uses the locally pinned `npm-check-updates` to move npm
dependencies past existing version pins, saves exact versions, installs them and
refreshes `package-lock.json`, then runs the installation's checks.
Peer conflicts fail visibly; the command does not use npm's `--force` or
`--legacy-peer-deps`. Review the manifest/lockfile diff and any major-version
migration requirements. If installation fails after manifest updates, resolve the
reported conflict before using `npm run setup`; no automatic rollback discards your edits.
Workspace dependencies are upgraded too; the local `@joeblew999/remy-ui` and `@joeblew999/remy-auth-contract` references are excluded
from registry upgrades. Node and the skill-source pins are managed separately.

### Verification

The flow is four steps: `dev:change` (the check, seconds, after every change), `dev:land` (commit,
main, push, staging; GitHub runs the heavy checks), `dev:promote` (production) and `dev:release`, with
`dev:start` and `dev:done` around a piece of work and `dev:status` to look; a gate in every heavy
command refuses it outside them. The rule is in
[how we work](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest), the commands in
[the command line](./tasks.md).

`npx remy verify` is the release's gate: `dev:release` runs it. An installation ends with
`npx remy verify setup` (`npm run setup`, `npm run packages -- upgrade` and `npm run upgrade` run it): about
a minute, no browser. Nobody runs the gate while coding (`dev:change` is the check); by hand, on
purpose, it is `REMY_FLOW=hand npx remy verify`. The installation's checks are the dependencies against the
lockfile, MCP registration, the flow's guard, the CLI versions, the tooling invariants (`npx remy verify
tooling`: every `package.json` matches the lockfile, the Wrangler configuration keeps previews off and
observability on, the workflows name only scripts that exist, every installed skill comes from a
pinned source with its Claude link), then the check. They use the existing local installation and
do not provision Cloudflare resources. The gate then runs every browser check of ours in every
language (`npm run test -- every`) against the production artifact in local Workers using installed
Chrome, then the consumer fixture. Google's audits are not in it: `npm run test -- google` and
`npm run test -- cwv`, which the release runs after it. No deployment is performed. See [the GUI proof](./gui.md) for scope and commands.


## Start or reload your agent

### VS Code Codex extension

Open this repository in VS Code and use the Codex sidebar. The extension ships
its own executable; the project's npm CLI installation serves terminal users.
The [Codex CLI and IDE extension share MCP configuration](https://developers.openai.com/learn/docs-mcp).
Our project registration writes `.codex/config.toml`; trust the project in Codex
so that project configuration can load. VS Code's `.vscode/mcp.json` configures
its own MCP client and is not the Codex extension's configuration file.

After changing skills or MCP configuration:

1. Run `npx remy mcp register` in the repository terminal.
2. Save your work, open the Command Palette (`Cmd+Shift+P` on macOS), and run
   **Developer: Reload Window**.
3. Reopen the Codex sidebar and continue the conversation. Verify that the agent
   can call the newly configured tools; registration alone does not prove a connection.

`npm run codex:resume` launches a terminal session; it does not reload the extension.
The installed `code` CLI has no documented reload-window flag, so reloading uses
VS Code's built-in command rather than a shell wrapper that pretends to restart it.

### Terminal agents

After `npm run setup`, use the installed Codex or Claude Code CLI:

```sh
npm run codex             # New Codex conversation
npm run codex:resume      # Resume latest Codex conversation in this project
npm run claude            # New Claude conversation
npm run claude:resume     # Resume latest Claude conversation in this project
```

To reload skills and MCP configuration, exit the current agent with `/exit`, then
run its `:resume` script from your terminal. Use `/mcp` inside the agent to check the
connection. Pass additional upstream options after `--`, for example
`npm run codex -- --help`. Setup installs the pinned official
[`@openai/codex` CLI](https://learn.chatgpt.com/docs/codex/cli) locally, and the
Codex scripts use that executable directly rather than relying on your shell PATH.
`npm run packages -- upgrade` updates it alongside the other dependencies. Authenticate when
prompted. Claude Code is installed separately; launching Codex does not require it.


## Agent skills

The skill sources are the `pins` of
[packages/ui/src/cli/skills.ts](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/cli/skills.ts): Better Auth, Cloudflare, Chrome DevTools, Modern Web
Guidance, shadcn, Playwright CLI, GitHub release and TanStack Router/Start. TanStack's skills are
named one by one, including its `react-router` skill (the React bindings), which replaced Remix's
skill of the same name: skills install flat by name, so the two cannot coexist. TanStack Form's
skills are not installed: they live only on its v2 alpha branches and describe the 2.0 alpha API, not
the 1.x we pin; add them when we move to Form 2. Install the skills locally:

```sh
npx remy skills install
npx remy skills list
```

To reinstall from scratch, run `npx remy skills remove` then `npx remy skills install`.

Skills live in `.agents/skills/`; `.claude/skills/` links to the same files.

### The `remy` skill: the platform's rules for every repo's agents

Beside the pinned skills, `remy skills install` installs `remy` from the installed package
(`./node_modules/@joeblew999/remy-ui/skills`), so its version is the package's: the rules of the
version an app runs, offline. It is every page of these developer docs exactly as the docs Worker serves them to
AI tools (`/dev/llms.txt`, each page's `.md`: includes resolved, components as text), made by `remy skills build`
when the package is packed or published (never in the quick check). So the skill, `llms.txt`, each page's
Markdown and the MCP servers are one text from one source: a page cannot reach one and miss another. The live
docs (`/dev/llms.txt`, `/api/mcp/dev`) always have the newest; the skill says so. In an app, `npx remy rules` keeps a marked
block in `AGENTS.md` pointing its agents at the skill and naming the version; `npm run setup` and
`npm run upgrade` run it, so an upgrade changes the rules the agents read in the same step.
remy-auth's own `AGENTS.md` is a pointer to [Agents: start here](./agents.md).
The installer records provenance in `skills-lock.json`. Re-running installation
restores the selected skills from the pinned sources; update their source commits deliberately to adopt upstream
changes. Only `skills-lock.json` is committed; the installed skills and their Claude links are
ignored and recreated by `npm run setup` or `npx remy skills install`.
`npx remy skills list` shows what is installed; [the skills plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/agent-skills.md)
tracks dependencies without an official skill. Reload an existing agent session
if newly installed skills are not yet visible.

To add a source, only from the library's own maintainers:

1. Pin it in `pins` in `packages/ui/src/cli/skills.ts` as
   `https://github.com/<owner>/<repo>/tree/<commit>`, using the
   commit from `git ls-remote https://github.com/<owner>/<repo> HEAD`, naming the skills to take
   rather than `'*'` when the repository also ships contributor-only skills.
2. Run `npx remy skills remove`, `npx remy skills install` and `npx remy verify tooling`
   (seconds), which reads the pins and rejects installed skills from unpinned sources.


## MCP registration

Skills provide instructions and workflows; MCP provides callable tools. Chrome
DevTools uses both. Modern Web Guidance uses its CLI, and many auth/Cloudflare
skills also work through the existing CLIs; a skill does not automatically require
an MCP server.

```sh
npx remy mcp register   # Also runs during npm run setup
npx remy mcp verify     # Also runs in the installation's checks
npx remy mcp status     # Requires both Codex and Claude CLIs
```

Registration (`packages/ui/src/cli/mcp.ts`) writes the `chrome-devtools` entry to
project-local `.codex/config.toml` and `.mcp.json`. Each client launches the app's own
`chrome-devtools-mcp` (isolated, headless, telemetry off) with an absolute path. Generated files
contain machine-specific paths and are gitignored; rerun registration after moving the checkout.
Unrelated settings and servers are preserved. Changed existing files receive a
`.bak` recovery copy; TOML serialization can normalize formatting and comments.

The server uses the pinned npm package, an isolated headless Chrome profile, and
has tool telemetry and CrUX uploads disabled. The MCP process is separate from the
CLI's `browser:start`/`browser:stop` session; the agent client manages its lifetime.

Reload the agent after registration. Codex only loads project configuration in a
trusted project. Claude may show **Pending approval** for a new project MCP server;
review it in Claude's `/mcp` interface. Registration does not bypass client trust or
approval settings. See [Codex MCP configuration](https://developers.openai.com/codex/mcp)
and [Claude MCP scopes](https://code.claude.com/docs/en/mcp).

`remy mcp verify` checks configuration, not a live connection. `remy mcp status` shows what
the clients see (Claude also checks connectivity for approved servers).


## Browser tooling

Google's [Chrome DevTools agent tools](https://developer.chrome.com/docs/devtools/agents)
provide browser interaction, screenshots, accessibility inspection, network/cookie
debugging, Lighthouse and performance analysis. Install Google Chrome separately;
the browser is not installed by project setup. The CLI is experimental and pinned with
the other npm tools, so `npm run packages -- upgrade` updates it too.

```sh
npm run browser:start                           # Isolated, headless Chrome session
npm run browser -- new_page http://localhost:3000
npm run browser -- list_pages
npm run browser -- take_snapshot 1              # Use the returned page ID
npm run browser -- click 1 "UID_FROM_SNAPSHOT"
npm run browser:stop
```

Run `npm run browser:start -- --headless=false` for a visible window. Start once
per session; subsequent CLI calls reuse the background daemon. Starting again
restarts that daemon. These sessions use a temporary Chrome profile; the start script
disables tool usage telemetry and CrUX URL uploads. Stop the session when finished.
Use `npm run browser -- --help` for upstream commands.


## Modern web implementation guidance

Google's [Modern Web Guidance](https://developer.chrome.com/docs/modern-web-guidance)
complements browser inspection with implementation guidance for native HTML/CSS,
forms, accessibility, performance, passkeys and browser compatibility. The main
`modern-web-guidance` skill is installed for both agents. The separate
`chrome-extensions` skill is omitted because this project is a web service and UI.

```sh
npm run web -- search "animate a dialog modal backdrop"
npm run web -- retrieve "GUIDE_ID_FROM_SEARCH"
npm run web -- list
```

Use the locally pinned `web` script in this repo in place of the upstream
skill's `npx modern-web-guidance@latest` examples. `npm run packages -- upgrade` updates the CLI;
`npx remy skills install` restores the commit-pinned skill. Google's alternative `skills`
installer keeps our existing `.agents` and `.claude` layout without a second
installer or automatic skill updates. If a search returns no matches, use `list` to browse guide IDs.
Browser support defaults to the skill's **Baseline Widely available** policy, with fallbacks for newer features.


## Cloudflare observability

The [observability plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/observability.md) covers logs, traces, metrics,
D1 health, durable auth audit records, correlation, dashboards and alerts.
`wrangler.jsonc` enables logs/traces and URL query redaction for the GUI Worker.
A GUI Worker entry now emits request IDs, status and timing without logging URLs,
headers or cookies. Sign-in's durable audit records are not implemented.

```sh
npm run logs -- --help
npm run errors -- --help
```

Both use the configured Worker; `npm run logs` also accepts an explicit Worker name.
`npm run errors` filters Worker invocation failures, not all HTTP error responses. Durable audit
storage, dashboards and alert delivery are open work in the observability plan.

### The docs answers on Cloudflare: AI Search and AI Gateway

Two Cloudflare products sit behind the docs' Ask AI (the docs Worker), and they are easy to mix up:

- **AI Search** is the index (`remy-docs-pages`, remy-auth's; every name here is `docs.config.ts`'s
  `ask`). It reads the docs itself from the R2 bucket `remy-docs` (one Markdown file per docs page and language, `<site>/<lang>/<page>.md`, synced hourly
  and whenever `docs publish` asks),
  finds the passages that match a question, and asks a Workers AI model to write the answer.
- **R2** holds the files AI Search reads. `docs publish` makes the bucket hold exactly the docs
  pages: it puts each one and deletes anything else, so a removed page leaves the answers too.
- **AI Gateway** is the meter in front of the model. Every model call AI Search makes passes through
  it (`remy-docs`), and it logs each one with its cost, tokens and time (and the question). It holds
  no docs. Spend limits and rate limits live here; `npm run docs -- observe ai-usage` and `ai-check` read it.

Local or remote: the docs pages, the Ask AI page and all checks run locally; answering
exist only on Cloudflare (AI Search has no local version). Every command says in its header comment
whether it is local or remote (and production).

```sh
npm run docs -- publish                          # REMOTE, PRODUCTION: bucket = docs pages, the index's sync waited for, then the fixed questions (dev:promote runs it)
npm run docs -- questions                        # REMOTE: the fixed questions alone (docs/content/questions.json), search only, no answer written
CLOUDFLARE_ENV=ask npm run docs -- dev           # LOCAL docs Worker, answers from the live index
npm run docs -- answers off                      # REMOTE, PRODUCTION: emergency stop, seconds, no build
npm run docs -- answers on                       # REMOTE, PRODUCTION: resume
fnox exec -- npm run docs -- observe ai-check    # REMOTE, read only: AI Search, AI Gateway, answers paused or not
fnox exec -- npm run docs -- observe gateway     # REMOTE: the gateway's settings
fnox exec -- npm run docs -- observe gateway rate-limit off   # REMOTE: change a setting (read back after); also logs on|off
```

Tokens: see [secrets](#secrets-fnox) below.

Costs: indexing is a few embeddings (a full reindex about $0.0005); a search without an answer next to
nothing; an answer about $0.0001 to $0.0007, and $0 when AI Search's cache has it.

Ask AI is each app's choice: `docs.config.ts`'s `ask` names its AI Search instance, R2 bucket, AI Gateway
and rate-limit namespace, and the docs Worker's Cloudflare configuration is generated from it
(`docs/.remy-docs/wrangler.json`). Without `ask` the docs have no Ask AI page, button or bindings.
`npm run docs -- provision` prints the commands that create an app's resources and creates nothing:
that costs money and is the owner's.

Stored history and the AI answers, read only, from Cloudflare's own APIs. The Worker, its AI Search
instance and that instance's AI Gateway come from its Wrangler configuration, so an including app gets its own:

```sh
fnox exec -- npm run observe -- events                      # Workers Logs, last 24 h: counts by event and level, latest 10
fnox exec -- npm run observe -- events ask --since 7d --limit 20   # one per question: outcome, time, citations
fnox exec -- npm run observe -- ai-usage                    # AI Gateway, last 7 days: calls, cache, failures, tokens, cost, time
fnox exec -- npm run observe -- ai-check                    # AI Search and gateway settings against Cloudflare's advice; fails on FAIL
```

### Secrets: fnox

Wrangler's login covers deploys, AI Search and Worker secrets, but cannot be granted AI Gateway or
Workers Logs access. For those, the commands read tokens from the environment:

- `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`: the shared Cloudflare token and account, the
  same keychain items in every joeblew999 repo. [`fnox.toml`](https://github.com/joeblew999/remy-auth/blob/main/fnox.toml) names them (values stay
  in the macOS keychain, never in the file); `fnox` is the machine's. Run a command with them:
  `fnox exec -- npm run observe -- ai-usage`. Set one with `fnox set -p keychain CLOUDFLARE_API_TOKEN <token>` (never
  omit `-p keychain`: without it the value is written to `fnox.toml` in plain text). It reads Workers Logs
  and AI Gateway, so it needs **Workers Observability Read** and **AI Gateway Edit**; AI Search is read
  with Wrangler's login.
One token does it all (the `dev` token at <https://dash.cloudflare.com/profile/api-tokens>): **AI Gateway
Edit** (which includes reading) and **Workers Observability Read** are the ones these commands need; changing
the gateway with `observe gateway` uses the same token, and every change is read back.
