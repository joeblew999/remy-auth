_Generated from the command line and package.json (`vp run fix` writes it; the check fails when it is stale). Change a command's line in remy-cli (`packages/remy-cli/src`), a script in package.json, a task in its package's vite.config.ts, never this file._

## What you run

Day to day: `vp run ready` after every edit; when the work is finished, git and GitHub's own commands: `git commit`, `git push` to main (its hook runs `vp run ci` first). `vp run release` is the owner's; Cloudflare deploys main by itself. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run` lists every task and script, and `vp run --last-details` says what the last run did.

| Command | What it does |
| --- | --- |
| `vp run dev` | the app with hot reload, its local state (.dev.vars, the migrations) and generated files first |
| `vp run build` | the production build, after the same; no upload |
| `vp run preview` | the production build on Cloudflare's local host, at PREVIEW_PORT (4173) |
| `vp run ready` | after every change: everything generated, the builds, Wrangler's deployment dry run, the project's own checks, the unit checks, then vp check (format, lint, types) |
| `vp run fix` | what the checks only verify, written: COMMANDS.md and each docs page's ending |
| `vp run ci` | what GitHub runs, the same here, each part one of GitHub's jobs (vp run test:browser --shard 1/3) (vp run ready → vp run test:browser → vp run test:audits → vp run new-app) |
| `vp run translate` | before a commit that changed text: the translations it made stale or missing (remy i18n translate) |
| `vp run release` | the owner's: every check in every language, the release checks, the publish rehearsed, Core Web Vitals, then the tag GitHub publishes from (remy release check → CHECK_LOCALES=all vp run ci → vp run template:check → vp run ui:verify → vp run publish:rehearse → remy test cwv → remy packages tag) |
| `vp run setup` | an installation, then every check (remy setup check → remy setup install → remy skills install → remy rules → remy mcp register → remy verify → vp run ready) |

## Everything the command line does

Each as `pnpm remy <command> [<subcommand>]`; a command run without a subcommand lists its own.

| Command | What it does |
| --- | --- |
| `pnpm remy release` | what a release needs before its checks (vp run release runs it first) |
| `pnpm remy release check` | a clean main, the translations complete, every changed package bumped |
| `pnpm remy plans` | the plans rule on this app's .plans/: few, short, closed |
| `pnpm remy plans status` | [--json]: now.md's open items, the open plans with their status line and last commit (STALE after 14 days), the parked ones |
| `pnpm remy plans check` | now.md exists, every link under .plans/ resolves, every open plan is linked from now.md; instant (the check runs it) |
| `pnpm remy plans close` | &lt;plan&gt; "&lt;what shipped&gt;": into done/ with its closing line, links to it repointed, its now.md item struck; staged, never committed |
| `pnpm remy plans park` | &lt;plan&gt; "&lt;why&gt;": the same into parked/ |
| `pnpm remy plans open` | &lt;plan&gt; "&lt;why now&gt;": a parked plan back into .plans/; its now.md item is yours to add |
| `pnpm remy i18n` | translations: check [messages\|docs] [--list] (offline, read-only), translate [messages\|docs] (the machine's Claude; vp run translate runs it, before a commit) |
| `pnpm remy i18n check` | [messages\|docs] [--list] [--strict]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in vp run ci, exit 1 with --strict; --list prints one line per gap |
| `pnpm remy i18n translate` | [messages\|docs] [files…]: what the checks list, by the machine's Claude (--model, default sonnet; --jobs at a time, default 8): only the changed sections and keys, with their records; named translation files redone in full; vp run translate runs it, before a commit |
| `pnpm remy cloudflare` | Cloudflare's builds deploy every push (main to production, a branch to its Preview); here: what each deployment runs, its URLs, the resources a binding needs |
| `pnpm remy cloudflare versions` | [origins…]: what each deployment runs, asked and never remembered: service, environment, commit and how far it is from this checkout, when it was deployed |
| `pnpm remy cloudflare urls` | [origin]: the URLs a deployment answers at |
| `pnpm remy cloudflare provisioned` | refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies |
| `pnpm remy setup` | an installation's first steps: what it needs, then the dependencies (vp run setup runs the rest) |
| `pnpm remy setup check` | what setup needs before it can start: git, package.json and its lockfile, wrangler.jsonc |
| `pnpm remy setup install` | vp install --frozen-lockfile with GitHub Packages' token (its install runs vp config: Vite Plus's Git hooks) |
| `pnpm remy verify` | the installation's checks |
| `pnpm remy verify setup` | the installation's checks: pnpm ls, MCP, doctor, tooling (vp run setup runs them); the default |
| `pnpm remy verify tooling` | the lockfile, wrangler.jsonc's observability, placement and preview_urls, the workflows, the skill pins |
| `pnpm remy verify doctor` | the tooling's versions |
| `pnpm remy skills` | the pinned official agent skills for Codex and Claude |
| `pnpm remy skills install` | every pinned skill, and the platform's remy skill from the installed package |
| `pnpm remy skills build` | remy-auth: the remy skill the package ships, from the docs build as AI tools read it (llms.txt); the skills:build task runs it |
| `pnpm remy skills list` | the pins and what is installed |
| `pnpm remy skills remove` | the installed skills removed |
| `pnpm remy mcp` | the MCP servers for Claude and Codex, registered per machine |
| `pnpm remy mcp register` | write .mcp.json and .codex/config.toml for this machine |
| `pnpm remy mcp verify` | the registration as it should be, written if not |
| `pnpm remy mcp status` | what each client has registered |
| `pnpm remy rules` | the platform's rules block in AGENTS.md, written or refreshed in place |
| `pnpm remy packages` | a repository that publishes packages: updates, the pack, the notes, the publish, the tag |
| `pnpm remy packages check` | package updates available for the repository's own dependencies (npm-check-updates; never its own packages); nothing changed |
| `pnpm remy packages upgrade` | upgrade every package, major versions included, and install (vp run setup checks the installation) |
| `pnpm remy packages pack` | pack each published workspace, as the publish would: a tarball a scratch app installs before any release |
| `pnpm remy packages notes` | &lt;version&gt;: the CHANGELOG section of a version, as the GitHub release's notes |
| `pnpm remy packages bumped` | every published package whose files changed since the last release tag has a new version |
| `pnpm remy packages publish` | [--release vX.Y.Z] [--dry-run]: each registry accepts its token, then each workspace whose version is new on its registry, then the GitHub release from its CHANGELOG notes; the tag's CI job runs the same |
| `pnpm remy packages tag` | on a clean main: the lead package's version as the tag, pushed with main (GitHub's release job publishes it) |
| `pnpm remy test` | the browser checks Vite Plus has no tool for: against a deployment (the suite, the smoke), Core Web Vitals on a deployment, and the local audits under one lock (the local build: vp run test:browser) |
| `pnpm remy test remote` | [origin] [--audits]: our browser checks against a deployment (production by default); --audits adds Google's, which judge production |
| `pnpm remy test live` | [origin]: the smoke against a deployment (every deploy ends with it) |
| `pnpm remy test audits` | [playwright options]: Google's audits on the local build, one speed measurement at a time on this machine (vp run test:audits runs it) |
| `pnpm remy test cwv` | [origin]: Core Web Vitals on a deployment, production unless a Preview's origin is given (the release runs it) |
| `pnpm remy browsers` | what a browser check needs on this machine: Playwright's Chromium, and on Linux a Han font |
| `pnpm remy docs` | the docs Worker, @joeblew999/remy-ui's, over this app's docs/ |
| `pnpm remy docs serve` | the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (a Preview of a pushed branch is Cloudflare's) |
| `pnpm remy docs test` | [remote]: the docs' browser checks on a local build, or against the deployment with every MCP server's tools |
| `pnpm remy docs answers` | on\|off: Ask AI's answers resumed, or stopped in seconds |
| `pnpm remy docs publish` | the bucket holds exactly the live docs pages, the index's sync waited for, then the fixed questions (after Cloudflare deployed the docs) |
| `pnpm remy docs questions` | the fixed questions (docs/content/questions.json) each find their page in the index; search only |
| `pnpm remy docs provision` | what Ask AI needs on Cloudflare, printed, created never |
| `pnpm remy docs init` | &lt;ref&gt;: a docs/ for this app from remy-auth's template at that tag |
| `pnpm remy docs observe` | …: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration) |
| `pnpm remy observe` | a Worker's logs and its AI Gateway |
| `pnpm remy observe events` | [event] [--since 24h] [--limit 10]: the Worker's log events |
| `pnpm remy observe ai-usage` | [--since 7d]: Ask AI's usage through the gateway |
| `pnpm remy observe ai-check` | Ask AI answers through its gateway |
| `pnpm remy observe gateway` | [show \| rate-limit off \| rate-limit &lt;requests&gt;/&lt;seconds&gt; \| logs on\|off]: the AI Gateway's settings |
| `pnpm remy shots` | [path] [--phone] [--dark] [--locale en,ar] [--video] [--all] [--out dir] [--origin url]: screenshots (or a WebM) of a page as a visitor sees it; --all every page, desktop and phone, light and dark, en and ar (pnpm remy shots) |
| `pnpm remy api` | spec [origin] [--urls]: the OpenAPI document a Worker generates from its contract |
| `pnpm remy upgrade` | &lt;version&gt;: this app onto a release of the platform: the package, the workflow's tag, the scripts, hooks and configuration of the blank app, the skills, the rules, the installation's checks (vp run upgrade) |

## The other scripts

The repository's own tools, as package.json defines them, each run as `vp run <script>`.

| Script | Runs |
| --- | --- |
| `vp run prepare` | `vp config --no-agent` |
| `vp run test:browser` | `vp run remy-auth#test:browser` |
| `vp run test:audits` | `vp run remy-auth#test:audits` |
| `vp run docs:cli` | `cd packages/remy-ui/src/docs && node ../../../../node_modules/@fumadocs/cli/dist/index.js` |
| `vp run ui:components` | `shadcn add button card input label badge alert field separator direction skeleton empty sidebar breadcrumb collapsible dropdown-menu avatar sheet tooltip navigation-menu use-mobile table spinner tabs --overwrite --yes -c apps/remy-auth` |
| `vp run ui:blocks` | `shadcn add @shadcn/sidebar-16 -c packages/remy-ui --diff src/blocks/sidebar-16/components/app-sidebar.tsx && shadcn add @shadcn/sidebar-16 -c packages/remy-ui --diff src/blocks/sidebar-16/components/nav-main.tsx && shadcn add @shadcn/sidebar-16 -c packages/remy-ui --diff src/blocks/sidebar-16/components/site-header.tsx` |
| `vp run ui:theme` | `shadcn apply nova --only theme --yes -c apps/remy-auth` |
| `vp run ui:verify` | `vp run ui:theme && vp run ui:components && vp fmt packages/remy-ui/src/components packages/remy-ui/src/hooks packages/remy-ui/src/styles apps/remy-auth/src/lib && git diff --exit-code -- packages/remy-ui/src/components packages/remy-ui/src/hooks packages/remy-ui/src/styles apps/remy-auth/src/lib` |
| `vp run ui:version` | `node scripts/version.ts` |
| `vp run template:check` | `node scripts/template-check.ts` |
