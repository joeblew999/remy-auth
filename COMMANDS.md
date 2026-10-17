_Generated from the command line and the shared tasks (`vp run fix` writes it; the check fails when it is stale). Change a command's line in `packages/ui/src/cli`, a task's or script's in `packages/ui/src/tasks.js`, never this file._

## What you run

Day to day, two: `vp run check` after every edit, `vp run land "<what changed>"` when the work is finished. `vp run promote` and `vp run release` are the owner's. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run --last-details` says what the last run did.

| Command | What it does |
| --- | --- |
| `vp run dev` | the app with hot reload, its local state (.dev.vars, the migrations) and generated files first |
| `vp run build` | the production build, after the same; no upload |
| `vp run preview` | the production build on Cloudflare's local host, at this checkout's port (4173 unless a worktree's own) |
| `vp run check` | after every change: everything generated, both builds, Wrangler's deployment dry run, the project's own checks, the unit checks, then vp check (format, lint, types) |
| `vp run fix` | what the check only verifies, written: COMMANDS.md and each docs page's ending |
| `vp run ci` | what GitHub runs, the same here: the check, the browser checks, Google's audits, a new app (each its own task, as GitHub's jobs: vp run test:browser --shard 1/3) |
| `vp run status` | what is going on: main and GitHub's verdicts, pull requests, deployments, worktrees, translations (remy status) |
| `vp run land "<what changed>"` | when the work is finished: a branch with main in it, the translations, every check, one commit through a pull request merged when GitHub agrees, then staging (remy land start → vp run translate → vp run ci → remy land finish) |
| `vp run promote` | the owner's: production and the docs from a pushed main GitHub passed (remy promote check → vp install --frozen-lockfile → remy cloudflare deploy → remy cloudflare docs-deploy → remy promote done) |
| `vp run release` | the owner's: every check in every language, the release checks, the publish rehearsed, Core Web Vitals, then the tag GitHub publishes from (remy release check → CHECK_LOCALES=all vp run ci → vp run release-checks → vp run publish:rehearse → remy test cwv → remy packages tag) |
| `vp run setup` | an installation, then the check (remy setup check → remy setup install → remy skills install → remy rules → remy mcp register → remy hooks → remy verify → vp run check) |

## Everything the command line does

Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.

| Command | What it does |
| --- | --- |
| `npx remy status` | what is going on: main with GitHub's verdicts, the open pull requests, the deployments, the worktrees, the translations, the top of now.md |
| `npx remy land` | a landing's two ends, around the checks (vp run land "&lt;what changed&gt;" runs both) |
| `npx remy land start` | the work on a branch of its own, main merged in |
| `npx remy land finish` | "&lt;what changed&gt;": one commit, its pull request, merged when GitHub agrees, this checkout on the new main, then staging |
| `npx remy promote` | production's two ends, around the deploys (vp run promote runs both) |
| `npx remy promote check` | a clean main, exactly what GitHub has, whose checks GitHub passed |
| `npx remy promote done` | what each deployment runs now, and the same written on the commit |
| `npx remy release` | what a release needs before its checks (vp run release runs it first) |
| `npx remy release check` | a clean main, the translations complete, every changed package bumped |
| `npx remy hooks` | register the status hook with Claude, so each session opens with remy status (--check: is it) |
| `npx remy plans` | the plans rule on this app's .plans/: few, short, closed |
| `npx remy plans status` | [--json]: now.md's open items, the open plans with their status line and last commit (STALE after 14 days), the parked ones |
| `npx remy plans check` | now.md exists, every link under .plans/ resolves, every open plan is linked from now.md; instant (the check runs it) |
| `npx remy plans close` | &lt;plan&gt; "&lt;what shipped&gt;": into done/ with its closing line, links to it repointed, its now.md item struck; staged, never committed |
| `npx remy plans park` | &lt;plan&gt; "&lt;why&gt;": the same into parked/ |
| `npx remy plans open` | &lt;plan&gt; "&lt;why now&gt;": a parked plan back into .plans/; its now.md item is yours to add |
| `npx remy i18n` | translations: check [messages\|docs] [--list] (offline, read-only), translate [messages\|docs] (the machine's Claude; vp run land runs it in the change) |
| `npx remy i18n check` | [messages\|docs] [--list] [--strict]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in vp run ci, exit 1 with --strict; --list prints one line per gap |
| `npx remy i18n translate` | [messages\|docs] [files…]: what the checks list, by the machine's Claude (--model, default sonnet; --jobs at a time, default 8): only the changed sections and keys, with their records; named translation files redone in full; vp run land runs it in the change |
| `npx remy cloudflare` | Cloudflare: production and staging deploys, the docs Worker, throwaway previews, what each deployment runs |
| `npx remy cloudflare deploy` | production from this checkout (origins.production): upload, wait for the new version, then its live smoke; refuses a D1, KV or R2 binding with no existing resource, since creating resources is the owner's (vp run promote runs it) |
| `npx remy cloudflare staging` | the same for staging (CLOUDFLARE_ENV=staging, the Wrangler configuration's env.staging): its own Worker at origins.staging, production untouched (remy land finish runs it on a machine signed in to Cloudflare) |
| `npx remy cloudflare docs-deploy` | the docs Worker, then its pages to Ask AI's index (vp run promote runs it) |
| `npx remy cloudflare versions` | [origins…]: what each deployment runs, asked and never remembered: service, environment, commit and how far it is from this checkout, when it was deployed |
| `npx remy cloudflare urls` | [origin]: the URLs a deployment answers at |
| `npx remy cloudflare preview` | [alias] [--keep]: this build as a throwaway Worker &lt;name&gt;-check-&lt;alias&gt; (production untouched), the browser checks against it, then deleted unless --keep (a machine signed in to Cloudflare; from Claude's cloud, push the branch instead) |
| `npx remy cloudflare preview-delete` | [name]: list the throwaway check Workers, or delete one; never production |
| `npx remy cloudflare wait` | &lt;origin&gt; &lt;wrangler-output-file&gt;: until the origin serves the uploaded version, every home-page asset included |
| `npx remy cloudflare provisioned` | refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies |
| `npx remy setup` | an installation's first steps: what it needs, then the dependencies (vp run setup runs the rest) |
| `npx remy setup check` | what setup needs before it can start: git, package.json and its lockfile, wrangler.jsonc |
| `npx remy setup install` | npm ci with GitHub Packages' token (its install runs vp config: Vite Plus's Git hooks) |
| `npx remy verify` | the installation's checks |
| `npx remy verify setup` | the installation's checks: npm ls, MCP, the status hook, doctor, tooling (vp run setup runs them); the default |
| `npx remy verify tooling` | the lockfile, wrangler.jsonc's observability, placement and preview_urls, the workflows, the skill pins |
| `npx remy verify doctor` | the tooling's versions |
| `npx remy skills` | the pinned official agent skills for Codex and Claude |
| `npx remy skills install` | every pinned skill, and the platform's remy skill from the installed package |
| `npx remy skills build` | remy-auth: the remy skill the package ships, from the docs build as AI tools read it (llms.txt); the skills:build task runs it |
| `npx remy skills list` | the pins and what is installed |
| `npx remy skills remove` | the installed skills removed |
| `npx remy mcp` | the MCP servers for Claude and Codex, registered per machine |
| `npx remy mcp register` | write .mcp.json and .codex/config.toml for this machine |
| `npx remy mcp verify` | the registration as it should be, written if not |
| `npx remy mcp status` | what each client has registered |
| `npx remy rules` | the platform's rules block in AGENTS.md, written or refreshed in place |
| `npx remy packages` | a repository that publishes packages: updates, the pack, the notes, the publish, the tag |
| `npx remy packages check` | package updates available for the repository's own dependencies (npm-check-updates; never its own packages); nothing changed |
| `npx remy packages upgrade` | upgrade every package, major versions included, and install (vp run setup checks the installation) |
| `npx remy packages pack` | pack each published workspace, as the publish would: a tarball a scratch app installs before any release |
| `npx remy packages notes` | &lt;version&gt;: the CHANGELOG section of a version, as the GitHub release's notes |
| `npx remy packages bumped` | every published package whose files changed since the last release tag has a new version |
| `npx remy packages publish` | [--release vX.Y.Z] [--dry-run]: each registry accepts its token, then each workspace whose version is new on its registry, then the GitHub release from its CHANGELOG notes; the tag's CI job runs the same |
| `npx remy packages tag` | on a clean main: the lead package's version as the tag, pushed with main (GitHub's release job publishes it) |
| `npx remy test` | the browser checks Vite Plus has no tool for: against a deployment (the suite, the smoke), Core Web Vitals on a preview, and the local audits under one lock (the local build: vp run test:browser) |
| `npx remy test remote` | [origin] [--audits]: our browser checks against a deployment (production by default); --audits adds Google's, which judge production |
| `npx remy test live` | [origin]: the smoke against a deployment (every deploy ends with it) |
| `npx remy test audits` | [playwright options]: Google's audits on the local build, one speed measurement at a time on this machine (vp run test:audits runs it) |
| `npx remy test cwv` | [alias]: Core Web Vitals on a throwaway preview Worker (the release runs it) |
| `npx remy browsers` | what a browser check needs on this machine: Playwright's Chromium, and on Linux a Han font |
| `npx remy docs` | the docs Worker, @joeblew999/remy-ui's, over this app's docs/ |
| `npx remy docs serve` | the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (preview is Cloudflare's) |
| `npx remy docs test` | [remote]: the docs' browser checks on a local build, or against the deployment with every MCP server's tools |
| `npx remy docs preview` | a preview Worker of the docs, answers paused |
| `npx remy docs answers` | on\|off: Ask AI's answers resumed, or stopped in seconds |
| `npx remy docs publish` | the bucket holds exactly the live docs pages, the index's sync waited for, then the fixed questions (vp run promote runs it) |
| `npx remy docs questions` | the fixed questions (docs/content/questions.json) each find their page in the index; search only |
| `npx remy docs provision` | what Ask AI needs on Cloudflare, printed, created never |
| `npx remy docs init` | &lt;ref&gt;: a docs/ for this app from remy-auth's template at that tag |
| `npx remy docs observe` | …: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration) |
| `npx remy observe` | a Worker's logs and its AI Gateway |
| `npx remy observe events` | [event] [--since 24h] [--limit 10]: the Worker's log events |
| `npx remy observe ai-usage` | [--since 7d]: Ask AI's usage through the gateway |
| `npx remy observe ai-check` | Ask AI answers through its gateway |
| `npx remy observe gateway` | [show \| rate-limit off \| rate-limit &lt;requests&gt;/&lt;seconds&gt; \| logs on\|off]: the AI Gateway's settings |
| `npx remy shots` | [path] [--phone] [--dark] [--locale en,ar] [--video] [--all] [--out dir] [--origin url]: screenshots (or a WebM) of a page as a visitor sees it; --all every page, desktop and phone, light and dark, en and ar (npx remy shots) |
| `npx remy api` | spec [origin] [--urls]: the OpenAPI document a Worker generates from its contract |
| `npx remy upgrade` | &lt;version&gt;: this app onto a release of the platform: the package, the workflow's tag, the skills, the rules, the status hook, the installation's checks (vp run upgrade) |

## The other scripts

The repository's own tools, as package.json defines them, each run as `vp run <script>`.

| Script | Runs |
| --- | --- |
| `vp run prepare` | `vp config --no-agent` |
| `vp run docs:cli` | `cd packages/ui/src/docs && node ../../../../node_modules/@fumadocs/cli/dist/index.js` |
| `vp run ui:components` | `shadcn add button card input label badge alert field separator direction skeleton empty sidebar breadcrumb collapsible dropdown-menu avatar sheet tooltip navigation-menu use-mobile table spinner tabs --overwrite --yes -c apps/remy-auth` |
| `vp run ui:blocks` | `shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/app-sidebar.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/nav-main.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/site-header.tsx` |
| `vp run ui:theme` | `shadcn apply nova --only theme --yes -c apps/remy-auth` |
| `vp run ui:verify` | `vp run ui:theme && vp run ui:components && vp fmt packages/ui/src/components packages/ui/src/hooks packages/ui/src/styles apps/remy-auth/src/lib && git diff --exit-code -- packages/ui/src/components packages/ui/src/hooks packages/ui/src/styles apps/remy-auth/src/lib` |
| `vp run ui:version` | `node scripts/version.ts` |
| `vp run template:check` | `node scripts/template-check.ts` |
