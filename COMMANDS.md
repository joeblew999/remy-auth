_Generated from the command line itself (`npx remy help --write`; `npm run dev:change` keeps it current). Change a command's line in `packages/ui/src/cli`, never this file._

## What you run

Day to day, three: `npm run dev:change` after every edit, `npm run dev:land -- "<what changed>"` when the work is finished, `npm run dev:promote` to put main live.

| Command | What it does |
| --- | --- |
| `npm run dev:status` | what is going on: main with GitHub's verdicts, the deployments, the worktrees, the translations |
| `npm run dev:start` | &lt;name&gt;: a worktree of your own from main, installed, its own ports, the guard |
| `npm run dev:change` | the check, in seconds |
| `npm run dev:land` | "&lt;what changed&gt;": the check and the browser checks here, then a pull request, merged when GitHub agrees, and staging |
| `npm run dev:promote` | production from a pushed main |
| `npm run dev:release` | every check, every language, then the tag |
| `npm run dev:done` | the worktree removed once its work is on main |

## Everything the command line does

Each as `npx remy <command> [<subcommand>]`; a command run without a subcommand lists its own.

| Command | What it does |
| --- | --- |
| `npx remy guard` | register the flow's guard and the status hook with Claude (--check: is it registered) |
| `npx remy guard-hook` | the Claude PreToolUse hook the guard registers: refuses a heavy check outside the flow, naming the step |
| `npx remy allowed` | &lt;task&gt;: may this heavy task run now (the gate the flow sets; refused with exit 1 outside it) |
| `npx remy check` | the check (dev:change), or one part: plans · single-copies · routes · types · commands · endings · unit · translations · docs |
| `npx remy plans` | the plans rule on this app's .plans/: few, short, closed |
| `npx remy plans status` | the open plans and now.md's open items |
| `npx remy plans check` | the rule holds (the check runs it) |
| `npx remy plans close` | &lt;plan&gt;: move a plan to done/ with its closing line |
| `npx remy plans park` | &lt;plan&gt;: move a plan to parked/ |
| `npx remy plans open` | &lt;plan&gt;: take a parked plan up again |
| `npx remy i18n` | translations: check [messages\|docs] [--list] (offline, read-only), translate [messages\|docs] (the machine's Claude; dev:land runs it in the change) |
| `npx remy i18n check` | [messages\|docs] [--list]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in npm run ci, exit 1 with I18N_STRICT=1 (the release); --list prints one line per gap |
| `npx remy i18n translate` | [messages\|docs] [files…]: what the checks list, by the machine's Claude (I18N_MODEL, default sonnet; I18N_JOBS at a time, default 4): only the changed sections and keys, with their records; named translation files redone in full; dev:land runs it in the change |
| `npx remy cloudflare` | Cloudflare: production and staging deploys, the docs Worker, throwaway previews, what each deployment runs |
| `npx remy cloudflare deploy` | production from this checkout (DEPLOY_ORIGIN): upload, wait for the new version, then its live smoke; refuses a D1, KV or R2 binding with no existing resource, since creating resources is the owner's (dev:promote runs it) |
| `npx remy cloudflare staging` | the same for staging (CLOUDFLARE_ENV=staging, the Wrangler configuration's env.staging): its own Worker at origins.staging, production untouched (dev:land runs it on a machine signed in to Cloudflare) |
| `npx remy cloudflare docs-deploy` | the docs Worker, then its pages to Ask AI's index (dev:promote runs it) |
| `npx remy cloudflare versions` | [origins…]: what each deployment runs, asked and never remembered: service, environment, commit and how far it is from this checkout, when it was deployed |
| `npx remy cloudflare urls` | [origin]: the URLs a deployment answers at |
| `npx remy cloudflare preview` | [alias] [--keep]: this build as a throwaway Worker &lt;name&gt;-check-&lt;alias&gt; (production untouched), the browser checks against it, then deleted unless --keep (a machine signed in to Cloudflare; from Claude's cloud, push the branch instead) |
| `npx remy cloudflare preview-delete` | [name]: list the throwaway check Workers, or delete one; never production |
| `npx remy cloudflare wait` | &lt;origin&gt; &lt;wrangler-output-file&gt;: until the origin serves the uploaded version, every home-page asset included |
| `npx remy cloudflare provisioned` | refuse when a D1, KV or R2 binding names no existing resource |
| `npx remy setup` | npm ci, the pinned skills, the agents' rules, MCP registration, the guard, the pre-push hook (npm run ci), then the installation's checks (npm run setup); preconditions: those alone |
| `npx remy verify` | the installation's checks and the release gate |
| `npx remy verify all` | everything: the installation's checks, every language, the consumers (the release gate; dev:release runs it); the default |
| `npx remy verify setup` | the installation's checks: npm ls, MCP, the guard, doctor, tooling, the check (npm run setup ends with it) |
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
| `npx remy packages check` | package updates available (npm-check-updates); nothing changed |
| `npx remy packages upgrade` | upgrade every package, major versions included, then the installation's checks |
| `npx remy packages pack` | pack each published workspace, as the publish would |
| `npx remy packages notes` | &lt;version&gt;: the CHANGELOG section of a version, as the GitHub release's notes |
| `npx remy packages bumped` | every published package whose files changed since the last release tag has a new version |
| `npx remy packages publish` | [--release vX.Y.Z] [--dry-run]: each registry accepts its token, then publish each workspace, then the GitHub release from its notes |
| `npx remy packages tag` | on a clean main: the lead package's version as the tag, pushed with main, then the publish |
| `npx remy packages release` | the release: translations strict, bumped, the gate, Google, Core Web Vitals on a preview, the tag (dev:release runs it) |
| `npx remy app` | the app itself: run it, build it, preview the build |
| `npx remy app dev` | Vite's dev server on local Workers with hot reload, port 5173 (npm run dev) |
| `npx remy app build` | the production build, then Wrangler's deployment dry run; no upload (npm run build) |
| `npx remy app preview` | build, then the production artifact on Cloudflare's local host at PREVIEW_PORT, 4173 by default; the browser checks run on the same (npm run preview) |
| `npx remy test` | the browser checks by hand: one area, the smoke, against a deployment, Core Web Vitals, the report (what CI runs is npm run ci) |
| `npx remy test only` | &lt;words&gt;: the checks whose title matches, in a few languages; the one targeted run by hand |
| `npx remy test smoke` | tier 1: every page answers, the home page hydrates |
| `npx remy test cwv` | [alias]: Core Web Vitals on a throwaway preview Worker |
| `npx remy test remote` | [origin]: the browser checks against a deployment: production by default, Google's audits included; any other origin (a preview, staging) our checks only |
| `npx remy test live` | [origin]: the smoke against a deployment (every deploy ends with it) |
| `npx remy test report` | [remote]: open the last HTML report, local or remote |
| `npx remy ci` | [check\|browser\|audits\|new-app] [--shard i/n] [--everything] [--last]: what GitHub runs, the same here: no part runs every part this change can affect, as a pull request does; --everything runs all of it in every language, nothing skipped, as main does |
| `npx remy last` | [command]: the last run's record (when it started, its parts, its total), of a command or of whatever ran last |
| `npx remy docs` | the docs Worker, @joeblew999/remy-ui's, over this app's docs/ |
| `npx remy docs dev` | the docs Worker with hot reload |
| `npx remy docs build` | the production build, which writes .remy-docs/ |
| `npx remy docs serve` | the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (preview is Cloudflare's) |
| `npx remy docs check` | build, binding types, types |
| `npx remy docs test` | [remote]: the docs' browser checks on a local build, or against the deployment with every MCP server's tools |
| `npx remy docs preview` | a preview Worker of the docs, answers paused |
| `npx remy docs answers` | on\|off: Ask AI's answers resumed, or stopped in seconds |
| `npx remy docs publish` | the bucket holds exactly the live docs pages, the index's sync waited for, then the fixed questions (dev:promote runs it) |
| `npx remy docs questions` | the fixed questions (docs/content/questions.json) each find their page in the index; search only |
| `npx remy docs provision` | what Ask AI needs on Cloudflare, printed, created never |
| `npx remy docs init` | &lt;ref&gt;: a docs/ for this app from remy-auth's template at that tag |
| `npx remy docs observe` | …: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration) |
| `npx remy observe` | a Worker's logs and its AI Gateway |
| `npx remy observe events` | [event] [--since 24h] [--limit 10]: the Worker's log events |
| `npx remy observe ai-usage` | [--since 7d]: Ask AI's usage through the gateway |
| `npx remy observe ai-check` | Ask AI answers through its gateway |
| `npx remy observe gateway` | [show \| rate-limit off \| rate-limit &lt;requests&gt;/&lt;seconds&gt; \| logs on\|off]: the AI Gateway's settings |
| `npx remy shots` | [path] [--phone] [--dark] [--locale xx]: screenshots of a page as a visitor sees it (npm run shots) |
| `npx remy api` | spec [origin] [--urls]: the OpenAPI document a Worker generates from its contract |
| `npx remy upgrade` | &lt;version&gt;: this app onto a release of the platform: the package, the workflow's tag, the skills, the rules, the guard, the installation's checks (npm run upgrade) |

## The other npm scripts

Shortcuts to the tools themselves, as package.json defines them.

| Script | Runs |
| --- | --- |
| `npm run generate` | `node packages/ui/paraglide.mjs && tsc -p packages/ui/src/cli` |
| `npm run release-checks` | `npm run template:check && npm run ui:verify` |
| `npm run local` | `node scripts/local.ts` |
| `npm run test:consumers` | `bash fixtures/consumer/run.sh` |
| `npm run logs` | `wrangler tail --format json` |
| `npm run errors` | `wrangler tail --format json --status error` |
| `npm run wrangler` | `wrangler` |
| `npm run browser` | `chrome-devtools` |
| `npm run browser:start` | `chrome-devtools start --isolated --headless --no-usage-statistics --no-performance-crux` |
| `npm run browser:stop` | `chrome-devtools stop` |
| `npm run web` | `modern-web-guidance` |
| `npm run codex` | `codex` |
| `npm run codex:resume` | `codex resume --last` |
| `npm run claude` | `claude` |
| `npm run claude:resume` | `claude --continue` |
| `npm run auth` | `auth` |
| `npm run auth:info` | `auth info` |
| `npm run auth:generate` | `node scripts/auth-generate.ts` |
| `npm run auth:migrate` | `wrangler d1 migrations apply DB --local && wrangler d1 migrations apply DEMO_DB --local` |
| `npm run auth:mail` | `node scripts/auth-mail.ts` |
| `npm run auth:provision` | `node scripts/auth-provision.ts` |
| `npm run docs:cli` | `cd packages/ui/src/docs && node ../../../../node_modules/@fumadocs/cli/dist/index.js` |
| `npm run ui:components` | `shadcn add button card input label badge alert field separator direction skeleton empty sidebar breadcrumb collapsible dropdown-menu avatar sheet tooltip navigation-menu use-mobile table spinner tabs --overwrite --yes` |
| `npm run ui:blocks` | `shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/app-sidebar.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/nav-main.tsx && shadcn add @shadcn/sidebar-16 -c packages/ui --diff src/blocks/sidebar-16/components/site-header.tsx` |
| `npm run ui:theme` | `shadcn apply nova --only theme --yes` |
| `npm run ui:verify` | `npm run ui:theme && npm run ui:components && git diff --exit-code -- packages/ui/src/components packages/ui/src/styles src/lib` |
| `npm run ui:version` | `node scripts/version.ts` |
| `npm run template:check` | `node scripts/template-check.ts` |
