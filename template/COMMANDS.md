_Generated from the command line and package.json (`vp run fix` writes it; the check fails when it is stale). Change a command's line in remy-cli (`packages/remy-cli/src`), a script in package.json, a task in its package's vite.config.ts, never this file._

## What you run

Day to day: `vp run ready` after every edit; when the work is finished, git and GitHub's own commands: `git commit`, `git push` to main (its hook runs `vp run ci` first). Cloudflare deploys main by itself. `vp dev`, `vp build`, `vp preview` and `vp check` are Vite Plus's own tools, without the app's preparation; `vp run` lists every task and script, and `vp run --last-details` says what the last run did.

| Command | What it does |
| --- | --- |
| `vp run dev` | the app with hot reload, its local state (.dev.vars, the migrations) and generated files first |
| `vp run build` | the production build, after the same; no upload |
| `vp run preview` | the production build on Cloudflare's local host, at PREVIEW_PORT (4173) |
| `vp run ready` | after every change: everything generated, the builds, Wrangler's deployment dry run, the project's own checks, the unit checks, then vp check (format, lint, types) |
| `vp run fix` | what the checks only verify, written: COMMANDS.md and each docs page's ending |
| `vp run ci` | what GitHub runs, the same here, each part one of GitHub's jobs (vp run test:browser --shard 1/3) (vp run ready → vp run test:browser → vp run test:audits) |
| `vp run translate` | before a commit that changed text: the translations it made stale or missing (remy i18n translate) |
| `vp run setup` | an installation: the dependencies, the skills (skills-lock.json), the agents' rules, then every check (pnpm config set --location global //npm.pkg.github.com/:_authToken "$(gh auth token)" → vp install → skills experimental_install → skills experimental_sync → remy rules → vp run ready) |

## Everything the command line does

Each as `pnpm remy <command> [<subcommand>]`; a command run without a subcommand lists its own.

| Command | What it does |
| --- | --- |
| `pnpm remy plans` | the plans rule on this app's .plans/: few, short, closed |
| `pnpm remy plans status` | [--json]: now.md's open items, the open plans with their status line and last commit (STALE after 14 days), the parked ones |
| `pnpm remy plans check` | now.md exists, every link under .plans/ resolves, every open plan is linked from now.md; instant (the check runs it) |
| `pnpm remy plans close` | &lt;plan&gt; "&lt;what shipped&gt;": into done/ with its closing line, links to it repointed, its now.md item struck; staged, never committed |
| `pnpm remy plans park` | &lt;plan&gt; "&lt;why&gt;": the same into parked/ |
| `pnpm remy plans open` | &lt;plan&gt; "&lt;why now&gt;": a parked plan back into .plans/; its now.md item is yours to add |
| `pnpm remy i18n` | translations: check [messages\|docs] [--list] (offline, read-only), translate [messages\|docs] (the machine's Claude; vp run translate runs it, before a commit) |
| `pnpm remy i18n check` | [messages\|docs] [--list] [--strict]: the offline checks, read-only, no git history: a warning (exit 0) while coding and in vp run ci, exit 1 with --strict; --list prints one line per gap |
| `pnpm remy i18n translate` | [messages\|docs] [files…]: what the checks list, by the machine's Claude (--model, default sonnet; --jobs at a time, default 8): only the changed sections and keys, with their records; named translation files redone in full; vp run translate runs it, before a commit |
| `pnpm remy cloudflare` | Cloudflare's builds deploy every push (main to production, a branch to its Preview); here: the resources a binding needs |
| `pnpm remy cloudflare provisioned` | refuse when a D1, KV or R2 binding names no existing resource, or a D1 database (the Previews' included) keeps no read copies |
| `pnpm remy skills` | the remy skill the package ships, made from the developer docs |
| `pnpm remy skills build` | remy-auth: the remy skill the package ships, from the docs build as AI tools read it (llms.txt); the skills:build task runs it |
| `pnpm remy rules` | the platform's rules block in AGENTS.md, written or refreshed in place |
| `pnpm remy test` | the browser checks against a deployment (the suite, the smoke, Core Web Vitals); the local build's are Playwright run directly (vp run test:browser, vp run test:audits) |
| `pnpm remy test remote` | [origin] [--audits]: our browser checks against a deployment (production by default); --audits adds Google's, which judge production |
| `pnpm remy test live` | [origin]: the smoke against a deployment (every deploy ends with it) |
| `pnpm remy test cwv` | [origin]: Core Web Vitals on a deployment, production unless a Preview's origin is given |
| `pnpm remy docs` | the docs Worker, @joeblew999/remy-ui's, over this app's docs/ |
| `pnpm remy docs serve` | the built docs here at DOCS_PREVIEW_PORT (4174), as their checks and AI tools see them: llms.txt, each page's .md (a Preview of a pushed branch is Cloudflare's) |
| `pnpm remy docs test` | [remote]: the docs' browser checks on a local build, or against the deployment with every MCP server's tools |
| `pnpm remy docs answers` | on\|off: Ask AI's answers resumed, or stopped in seconds |
| `pnpm remy docs publish` | the bucket holds exactly the live docs pages, the index's sync waited for, then the fixed questions (after Cloudflare deployed the docs) |
| `pnpm remy docs questions` | the fixed questions (docs/content/questions.json) each find their page in the index; search only |
| `pnpm remy docs provision` | what Ask AI needs on Cloudflare, printed, created never |
| `pnpm remy docs observe` | …: the docs Worker's logs and its AI Gateway (remy observe, with the docs' configuration) |
| `pnpm remy observe` | the docs' AI Gateway (a Worker's logs: wrangler tail, or the dashboard's Observability) |
| `pnpm remy observe ai-usage` | [--since 7d]: Ask AI's usage through the gateway |
| `pnpm remy observe ai-check` | Ask AI answers through its gateway |
| `pnpm remy observe gateway` | [show \| rate-limit off \| rate-limit &lt;requests&gt;/&lt;seconds&gt; \| logs on\|off]: the AI Gateway's settings |
| `pnpm remy shots` | [path] [--phone] [--dark] [--locale en,ar] [--video] [--all] [--out dir] [--origin url]: screenshots (or a WebM) of a page as a visitor sees it; --all every page, desktop and phone, light and dark, en and ar (pnpm remy shots) |
| `pnpm remy upgrade` | &lt;version&gt;: this app onto a release of the platform: the package, the workflow's tag, the scripts, hooks and configuration of the blank app, then vp run setup (vp run upgrade) |

## The other scripts

The repository's own tools, as package.json defines them, each run as `vp run <script>`.

| Script | Runs |
| --- | --- |
| `vp run prepare` | `vp config --no-agent` |
