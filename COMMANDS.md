_Generated from the command line itself (`npx remy help --write`; `vp run fix` writes it, and the check fails when it is stale). Change a command's line in `packages/ui/src/cli`, never this file._

## What you run

Day to day, two: `vp run check` after every edit, `vp run land "<what changed>"` when the work is finished. `vp run promote` and `vp run release` are the owner's. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run --last-details` says what the last run did.

| Command | What it does |
| --- | --- |
| `vp run dev` | the app with hot reload, its local state (.dev.vars, the migrations) and generated files first |
| `vp run build` | the production build and Wrangler's deployment dry run, after the same; no upload |
| `vp run preview` | the production build on Cloudflare's local host, at PREVIEW_PORT (4173 by default) |
| `vp run check` | after every change: everything generated, both builds, the project's own checks, then vp check (format, lint, types) |
| `vp run fix` | what the check only verifies, written: COMMANDS.md and each docs page's ending |
| `vp run ci` | what GitHub runs, the same here: the check, then the browser checks, Google's audits and a new app (`vp run ci browser --shard 1/3` runs one part) |
| `vp run status` | what is going on: main with GitHub's verdicts, the open pull requests, the deployments, the worktrees, the translations, the top of now.md |
| `vp run land "<what changed>"` | after vp run ci: one commit, a pull request, merged when GitHub agrees, then staging |
| `vp run promote` | production from a pushed main |
| `vp run release` | after vp run ci: the repository's release checks, Core Web Vitals on a preview, then the tag |
| `vp run setup` | npm ci (which installs Vite Plus's Git hooks), the pinned skills, the agents' rules, MCP registration, the guard, then the installation's checks (remy verify setup); vp run setup runs vp run check after it |

## Everything the command line does

Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.

| Command | What it does |
| --- | --- |
| `npx remy guard` | register the flow's guard and the status hook with Claude (--check: is it registered) |
| `npx remy guard-hook` | the Claude PreToolUse hook the guard registers: refuses a heavy check outside the flow, naming the step |
| `npx remy allowed` | &lt;task&gt;: may this heavy task run now (the gate the flow sets; refused with exit 1 outside it) |
| `npx remy plans` | the plans rule on this app's .plans/: few, short, closed |
| `npx remy plans status` | [--json]: now.md's open items, the open plans with their status line and last commit (STALE after 14 days), the parked ones |
| `npx remy plans check` | now.md exists, every link under .plans/ resolves, every open plan is linked from now.md; instant (the check runs it) |
| `npx remy plans close` | &lt;plan&gt; "&lt;what shipped&gt;": into done/ with its closing line, links to it repointed, its now.md item struck; staged, never committed |
| `npx remy plans park` | &lt;plan&gt; "&lt;why&gt;": the same into parked/ |
| `npx remy plans open` | &lt;plan&gt; "&lt;why now&gt;": a parked plan back into .plans/; its now.md item is yours to add |
| `npx remy i18n` | translations: check [messages\|docs] [--list] (offline, read-only), translate [messages\|docs] (the machine's Claude; vp run land runs it in the change) |
| `npx remy i18n check` | [messages\|docs] [--list]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in vp run ci, exit 1 with I18N_STRICT=1 (the release); --list prints one line per gap |
| `npx remy i18n translate` | [messages\|docs] [files…]: what the checks list, by the machine's Claude (I18N_MODEL, default sonnet; I18N_JOBS at a time, default 4): only the changed sections and keys, with their records; named translation files redone in full; vp run land runs it in the change |
| `npx remy cloudflare` | Cloudflare: production and staging deploys, the docs Worker, throwaway previews, what each deployment runs |
| `npx remy cloudflare deploy` | production from this checkout (DEPLOY_ORIGIN): upload, wait for the new version, then its live smoke; refuses a D1, KV or R2 binding with no existing resource, since creating resources is the owner's (vp run promote runs it) |
| `npx remy cloudflare staging` | the same for staging (CLOUDFLARE_ENV=staging, the Wrangler configuration's env.staging): its own Worker at origins.staging, production untouched (vp run land runs it on a machine signed in to Cloudflare) |
| `npx remy cloudflare docs-deploy` | the docs Worker, then its pages to Ask AI's index (vp run promote runs it) |
| `npx remy cloudflare versions` | [origins…]: what each deployment runs, asked and never remembered: service, environment, commit and how far it is from this checkout, when it was deployed |
| `npx remy cloudflare urls` | [origin]: the URLs a deployment answers at |
| `npx remy cloudflare preview` | [alias] [--keep]: this build as a throwaway Worker &lt;name&gt;-check-&lt;alias&gt; (production untouched), the browser checks against it, then deleted unless --keep (a machine signed in to Cloudflare; from Claude's cloud, push the branch instead) |
| `npx remy cloudflare preview-delete` | [name]: list the throwaway check Workers, or delete one; never production |
| `npx remy cloudflare wait` | &lt;origin&gt; &lt;wrangler-output-file&gt;: until the origin serves the uploaded version, every home-page asset included |
| `npx remy cloudflare provisioned` | refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies |
| `npx remy setup` | npm ci (which installs Vite Plus's Git hooks), the pinned skills, the agents' rules, MCP registration, the guard, then the installation's checks (remy verify setup); vp run setup runs vp run check after it |
| `npx remy verify` | the installation's checks |
| `npx remy verify setup` | the installation's checks: npm ls, MCP, the guard, doctor, tooling (remy setup ends with them); the default |
| `npx remy verify tooling` | the lockfile, wrangler.jsonc's observability, placement and preview_urls, the workflows, the skill pins |
| `npx remy verify doctor` | the tooling's versions |
| `npx remy skills` | the pinned official agent skills for Codex and Claude |
| `npx remy skills install` | every pinned skill, and the platform's remy skill from the installed package |
| `npx remy skills build` | remy-auth: the remy skill the package ships, from the developer docs as AI tools read them (llms.txt); packing runs it |
| `npx remy skills list` | the pins and what is installed |
| `npx remy skills remove` | the installed skills removed |
| `npx remy mcp` | the MCP servers for Claude and Codex, registered per machine |
| `npx remy mcp register` | write .mcp.json and .codex/config.toml for this machine |
| `npx remy mcp verify` | the registration as it should be, written if not |
| `npx remy mcp status` | what each client has registered |
| `npx remy rules` | the platform's rules block in AGENTS.md, written or refreshed in place |
| `npx remy packages` | a repository that publishes packages: updates, the pack, the notes, the publish, the tag, the release |
| `npx remy packages check` | package updates available for the repository's own dependencies (npm-check-updates; never its own packages); nothing changed |
| `npx remy packages upgrade` | upgrade every package, major versions included, then the installation's checks |
| `npx remy packages pack` | pack each published workspace, as the publish would: a tarball a scratch app installs before any release |
| `npx remy packages notes` | &lt;version&gt;: the CHANGELOG section of a version, as the GitHub release's notes |
| `npx remy packages bumped` | every published package whose files changed since the last release tag has a new version |
| `npx remy packages publish` | [--release vX.Y.Z] [--dry-run]: each registry accepts its token, then each workspace whose version is new on its registry, then the GitHub release from its CHANGELOG notes; the tag's CI job runs the same |
| `npx remy packages tag` | on a clean main: the lead package's version as the tag, pushed with main, then the publish |
| `npx remy packages release` | the release, after vp run ci: the app's release-checks script, Core Web Vitals on a preview, the tag (vp run release runs it) |
| `npx remy test` | the browser checks against a deployment, which Vite Plus has no tool for: the suite, the smoke, Core Web Vitals on a preview (the local build: vp run test:browser) |
| `npx remy test remote` | [origin]: the browser checks against a deployment: production by default, Google's audits included; any other origin (a preview, staging) our checks only |
| `npx remy test live` | [origin]: the smoke against a deployment (every deploy ends with it) |
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
| `npx remy last` | [command]: the last run's record (when it started, its parts, its total), of a command or of whatever ran last |
| `npx remy upgrade` | &lt;version&gt;: this app onto a release of the platform: the package, the workflow's tag, the skills, the rules, the guard, the installation's checks (vp run upgrade) |

## The other scripts

The repository's own tools, as package.json defines them, each run as `vp run <script>`.

| Script | Runs |
| --- | --- |
| `vp run prepare` | `vp config --no-agent` |
| `vp run release-checks` | `vp run template:check && vp run ui:verify` |
| `vp run test:consumers` | `bash fixtures/consumer/run.sh` |
| `vp run docs:cli` | `cd packages/ui/src/docs && node ../../../../node_modules/@fumadocs/cli/dist/index.js` |
| `vp run ui:components` | `shadcn add button card input label badge alert field separator direction skeleton empty sidebar breadcrumb collapsible dropdown-menu avatar sheet tooltip navigation-menu use-mobile table spinner tabs --overwrite --yes` |
| `vp run ui:blocks` | `shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/app-sidebar.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/nav-main.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/site-header.tsx` |
| `vp run ui:theme` | `shadcn apply nova --only theme --yes` |
| `vp run ui:verify` | `vp run ui:theme && vp run ui:components && git diff --exit-code -- packages/ui/src/components packages/ui/src/styles src/lib` |
| `vp run ui:version` | `node scripts/version.ts` |
| `vp run template:check` | `node scripts/template-check.ts` |
