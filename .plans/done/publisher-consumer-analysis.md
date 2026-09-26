# Publisher and consumers: analysis

Closed 2026-09-26: analysis used (package moves, drift fixes, new-consumer recipe, cf:preview fix); remainder in publisher-consumer.md.

Status: analysis for [publisher-consumer.md](publisher-consumer.md), 2026-09-25. Read only: no code
changed, no test run, nothing on Cloudflare. Evidence is file paths in remy-auth (here) and in
remy-auth-app (`../remy-auth-app/`, at `d62f804`, on `@joeblew999/remy-ui` 0.10.5 and
`tasks?ref=v0.10.5`). remy-auth `main` is at `330c3b7` with `packages/ui/package.json` 0.10.6
(unreleased; latest tag `v0.10.5`).

Headline: the approach holds (one package, one include, three `[env]` inputs, zero task overrides in
the consumer). What does not hold yet: a new consumer copies about 30 files by hand, the app name is
written in 7 places, the included `cf:preview` on `main` only works for remy-auth (it probes
`/en/docs`), and the docs/AI answers are remy-auth app code with hard-coded Cloudflare names.

## 1. A brand-new consumer, from an empty repo

What remy-auth-app actually needed, in order. "Copy" means a file written by hand or copied from
remy-auth-app; nothing generates it today.

| # | Step | Kind | Evidence |
| --- | --- | --- | --- |
| 1 | Install mise >= 2026.9.12, `gh auth login` (token with `read:packages`), Google Chrome, `wrangler login` later for deploys | prerequisite | `mise.toml` `min_version`; `tasks/project.toml` `project:setup` env; `packages/ui/src/playwright.js` (`channel: 'chrome'`) |
| 2 | `mise.toml`: `[tools] node`, `[settings] task.timings`, `[task_config] includes = ["git::…/remy-auth.git//tasks?ref=vX.Y.Z"]`, `[env] PREVIEW_PORT`, `PUBLIC_ORIGIN`, `DEPLOY_ORIGIN` | copy (22 lines) | `../remy-auth-app/mise.toml` |
| 3 | Optional `mise.dev.toml` (`ref=main`), gitignored `mise.local.toml` (`../remy-auth/tasks`) | copy | `../remy-auth-app/mise.dev.toml`, `docs/content/dev/tasks.md` |
| 4 | `.npmrc` with the GitHub Packages registry and `${GITHUB_TOKEN}` | copy (2 lines) | `../remy-auth-app/.npmrc`, `docs/content/dev/ui-package.md` l.99 |
| 5 | `package.json`: the package exact, its peers, and every binary the tasks call (vite, wrangler, @cloudflare/vite-plugin, @vitejs/plugin-react, @tailwindcss/vite, tailwindcss, fontaine, typescript, @types/*, @playwright/test, lighthouse, chrome-devtools-mcp, modern-web-guidance, smol-toml, lucide-react) | copy | `../remy-auth-app/package.json` (16 devDependencies) |
| 6 | **First `npm install` by hand**: `project:setup` runs `npm ci`, which fails without a lockfile | hand step | `tasks/project.toml` `project:setup` |
| 7 | `.gitignore` (node_modules, dist, reports, `.mcp.json`, `.codex/`, `.agents/skills/`, `.claude/skills/`, `worker-configuration.d.ts`, `mise.local.toml`) | copy | `../remy-auth-app/.gitignore` |
| 8 | Build and runtime config: `tsconfig.json`, `vite.config.ts` (56 lines), `wrangler.jsonc`, `playwright.config.ts` (2 lines) | copy | `../remy-auth-app/` |
| 9 | App code: `workers/app.ts`, `src/server.ts`, `src/router.tsx`, `src/entry.tsx`, `src/head.ts`, `src/origin.ts`, `src/paths.ts`, `src/preferred.ts`, `src/problem.tsx`, `src/formats.ts`, `src/styles.css`, 13 route files under `src/routes/` | copy (about 22 files, 350 lines) | `../remy-auth-app/src/` |
| 10 | `public/_headers`, `public/favicon.svg` | copy | `../remy-auth-app/public/` |
| 11 | `tests/gui.spec.ts`, `tests/lighthouse.spec.ts`, `tests/performance.spec.ts` | copy | `../remy-auth-app/tests/` |
| 12 | `AGENTS.md`, `CLAUDE.md` (`@AGENTS.md`) | copy | `../remy-auth-app/AGENTS.md` |
| 13 | Rename the app in 7 places (see drift D1) and pick `DEPLOY_ORIGIN`, which needs the account's workers.dev subdomain known in advance | hand step | grep of `remy-auth-app` in the consumer |
| 14 | `mise install && mise run project:setup` (npm ci, `skills:install` writes `skills-lock.json`, `mcp:register` writes `.mcp.json` and `.codex/config.toml`, `project:verify`) | task | `tasks/project.toml`, `tasks/skills.toml`, `tasks/mcp/register.mjs` |
| 15 | Commit `skills-lock.json`, `package-lock.json`, `src/routeTree.gen.ts` | hand step | `../remy-auth-app/.gitignore` (what is not ignored) |
| 16 | `mise run cf:deploy` (`GATE=1` for visitor code) | task | `tasks/cf/deploy` |
| 17 | CI: none. remy-auth-app has no `.github/`; level 2 never runs there in CI | missing | `ls -a ../remy-auth-app` |

Skills and MCP arrive with no copying (steps 14): good. Everything else is copying. The one-recipe
fix is not more docs but fewer files: make remy-auth-app a **GitHub template repository** and write
the recipe as `gh repo create <name> --template joeblew999/remy-auth-app --clone`, then set the
name once (D1), `npm install`, `mise run project:setup`, `mise run cf:deploy`. Upstream-owned (gh),
no scaffolding script of ours. The recipe then goes into the consumer section of `docs/content/dev/tooling.md`
and `docs/content/dev/tasks.md`, replacing the partial lists there.

Stale consumer docs found on the way: `../remy-auth-app/README.md` says "English, Spanish and
Arabic" (13 languages since 0.10.5), "pinned to a commit" (it is a tag), and names only three npm
packages the tasks need (`docs/content/dev/tasks.md` names seven, the real list is step 5).

## 2. Drift and duplication in remy-auth-app

| # | Where | What | Verdict |
| --- | --- | --- | --- |
| D1 | `wrangler.jsonc` `name`, `vite.config.ts` `prerenderWorker.name`, `workers/app.ts`, `src/server.ts`, `tests/gui.spec.ts` `observabilityChecks({ service })`, `mise.toml` `DEPLOY_ORIGIN`, `package.json` `name` | The app name 7 times | **Move**: wrangler's `name` is the one source. The worker helpers and `observabilityChecks` default `service` to the Worker name (build-time define or `unstable_readConfig`, which `tasks/cf/preview` already uses); vite derives `<name>-prerender`. `DEPLOY_ORIGIN` stays an input |
| D2 | `mise.toml` `PREVIEW_PORT = "4174"`, `PUBLIC_ORIGIN = "http://127.0.0.1:4174"` | Hard-coded; remy-auth reads the shell (`get_env`) so agents in worktrees pick ports (`docs/content/dev/how-we-work.md` "Sharing one machine"). A changed port leaves `PUBLIC_ORIGIN` wrong | **Fix in the recipe**: `PREVIEW_PORT = "{{ get_env(name='PREVIEW_PORT', default='4174') }}"`, `PUBLIC_ORIGIN = "http://127.0.0.1:{{ env.PREVIEW_PORT }}"`; better, the tasks default `PUBLIC_ORIGIN` from `PREVIEW_PORT` so the consumer sets two inputs |
| D3 | `mise.toml` | No `min_version`; remy-auth has `2026.9.12` and the tasks rely on it | **Recipe**: add it (an include cannot set it) |
| D4 | `vite.config.ts` vs remy-auth `vite.config.ts` | Same `FontaineTransform` fallbacks, `tailwindcss()`, `inlineCss`, `viteReact()`, host `127.0.0.1`; the consumer adds Cloudflare's prerender Worker and the page list (every path x locale, per-locale `404.html`) | **Move** the page list into the package (`prerenderPages({ notFoundPath })` next to `allPaths` in `@joeblew999/remy-ui/paths`, pure data, 15 lines). Plugin order stays in each config: the two apps differ (SSR vs prerender) and the plugins are upstream's |
| D5 | `playwright.config.ts` | One call to `playwrightConfig()`; remy-auth passes `wrangler dev --local` | **Own**: already shared |
| D6 | `wrangler.jsonc` | No `preview_urls: false` and no `redact_query_string` (remy-auth has both; `scripts/verify-tooling.mjs` asserts the second, but only for remy-auth) | **Move** the assertions into a shared check or `project:verify` step for every consumer; add both keys to the template |
| D7 | `public/_headers` | Byte-identical to remy-auth's | **Own** (Cloudflare reads it from `public/`), but add a shared check that `/assets/*` answers `immutable`; no check covers it today (`packages/ui/src/checks.js` has none) |
| D8 | `src/styles.css` | Same three imports as remy-auth, plus `@source "../node_modules/@joeblew999/remy-ui/src"` | **Move**: a package `tailwind.css` that imports the three and declares `@source "./"` (Tailwind resolves `@source` relative to the file that holds it), so a consumer writes one import and its own `@source "../src"`. Verify with a build |
| D9 | `src/routes/sitemap[.]xml.ts`, `robots[.]txt.ts` vs remy-auth's | Two implementations of the same XML (remy-auth adds docs and cache headers) | **Move** a `sitemapXml({ origin, extra })` and `robotsTxt(origin)` into `@joeblew999/remy-ui/seo`; routes become one-liners |
| D10 | `src/problem.tsx` vs remy-auth `src/problem.tsx` | Consumer's is a bare `<main>`; remy-auth's uses shadcn `Empty`, `Shell`, retry | **Move** remy-auth's into the package (`./problem`); both use it |
| D11 | `src/entry.tsx`, `src/preferred.ts`, `src/router.tsx` | Prerender-only glue for entry URLs and the language hint | **Own** for now; move when a second prerendered consumer exists |
| D12 | `tests/gui.spec.ts` | 11 check calls, 4 showcase imports; queue item 14 wants one line per shared set | **Move**: a package `prerenderedAppChecks({ sitePaths, appPaths })` (and `serverAppChecks`) that calls the set, options for the differences (`serverFn`, `serverRendered`, device path). remy-auth then keeps only its extras |
| D13 | `tests/lighthouse.spec.ts`, `tests/performance.spec.ts` | Page lists differ (remy-auth adds `/es`, docs) | **Own**: the page list is the app's decision |
| D14 | cspChecks | remy-auth calls `cspChecks`; the consumer does not | **Decide**: record whether the prerendered app sends a CSP (0.10.4 added security headers); if it does, call the check |
| D15 | `README.md` | Stale (section 1) | **Fix** with the template |
| D16 | CI | None in the consumer; `.plans/ci-node24.md` says "check remy-auth-app's workflows" | **Move**: reusable workflow (section 3) |

No task overrides exist in the consumer (`../remy-auth-app/mise.toml` has none): good.

## 3. More into the include

Found while reading, most urgent first:

- **`cf:preview` on `main` breaks every consumer without docs.** `tasks/cf/preview` waits for ten
  200s from `$origin/en/docs`; remy-auth-app has no docs, so it fails after 2 minutes, and so does
  `project:test:cwv`. Probe `/healthz` (already served by `withObservability`) or the base-locale
  home (`localizeUrl('/')`, as `packages/ui/src/playwright.js` does). Must be fixed before the next
  release tag.
- **The consumer on the tag has old tasks.** `git diff --stat v0.10.5 HEAD -- tasks` shows 12 files
  (throwaway-Worker `cf:preview`, `cf:preview-delete`, `GATE=1` `cf:deploy`, `cf:events`,
  `cf:ai-*`). Correct by design; they arrive with 0.10.6. Checked offline:
  `MISE_OFFLINE=1 mise tasks ls` in remy-auth-app lists the v0.10.5 tasks, and with `MISE_ENV=dev`
  lists an even older `main` (no wait step): the `main` cache is never refreshed on its own
  (section 6).
- Already included and generic: `cf:preview`, `cf:preview-delete` (name guard `<worker>-check-*`),
  `cf:wait`, `cf:deploy` with `GATE=1`, `cf:urls`, `cf:events`, `project:upgrade-ui`,
  `project:test:quick`, `project:test:google`, `project:test:cwv`. `cf:ai-*` read the AI Search
  binding from the consumer's wrangler config, so they are ready for item 4 but fail on an app with
  none; their descriptions should say so.
- **`cf:deploy`'s docs hook**: it probes `mise tasks info docs:publish`. Replace with a hook task
  like `project:generate`: an included `project:after-deploy` that does nothing, overridden by
  remy-auth (`docs:publish`). Same pattern, no probing.
- **Level 2 audits and language tiers**: already there (`project:test:google`, `QUICK_LOCALES`,
  `CHECK_LOCALES`). Missing: `project:test:languages` from `.plans/language-test-tiers.md`, whose
  text still says the quick tier is en, ar, ja, th while `tasks/project.toml` defaults to `en,ar`
  (owner: "just pick 2"); fix the plan text.
- **`GATE` rule**: lives in `docs/content/dev/how-we-work.md` (remy-auth) and the `cf:deploy` description;
  consumers see only the description. Fine: the consumer's `AGENTS.md` links `how-we-work.md`.
- **Skills verification** (`scripts/verify-tooling.mjs`, the skills-lock part) runs only in
  remy-auth; consumers install skills but never verify them. Move it to an included
  `skills:verify` file task that reads its sibling `tasks/skills.toml`, and call it from the shared
  `project:verify`.
- **CI**: add `.github/workflows/app.yml` in remy-auth as a reusable workflow (`on: workflow_call`,
  inputs none: it runs `npm ci`, `mise run project:typecheck`, `mise run project:test:google`, uploads
  the report), called by `google.yml` itself and by a 6-line consumer workflow pinned to the same
  tag. Needs `GITHUB_TOKEN` with `packages: read` in the consumer for `npm ci`.
- **Docs tasks**: `docs:dev`, `docs:publish`, `docs:questions`, `docs:answers:*` are remy-auth
  `mise.toml` tasks; they move with item 4, not before (they name `remy-docs`, `remy-docs-pages`).

## 4. Docs and AI answers for every consumer (sized, not built)

App-specific today, with the hard-coded names that block reuse:

| Piece | Where | Blocker |
| --- | --- | --- |
| Fumadocs source, table, pages, nav, search, ask form, answer view | `src/docs/` (13 files), `source.config.ts` | `src/docs/table.js` lists remy-auth's docs files and repository |
| Routes | `src/routes/docs.index.tsx`, `docs.$slug.tsx`, `docs.search.tsx`, `docs.ask.tsx`, `app.ask.tsx` | file routes must live in the app's route directory |
| Answer endpoint and limits | `src/ask.server.ts`, `src/ask.ts`, `src/ask-limits.ts` | binding names `DOCS_SEARCH`, `ASK_LIMIT` |
| Bindings | `wrangler.jsonc` `ai_search` `remy-docs-pages`, `ratelimits` `namespace_id "4281"`, `env.docs` | names per app |
| Publish and questions | `scripts/docs-publish.mjs` (`bucket = 'remy-docs'`, `instance = 'remy-docs-pages'`), `scripts/docs-questions.mjs` | constants; imports `../src/docs/table.js` |
| Gateway, spend limit | `tasks/cf/gateway.mjs`, `tasks/cf/observe.mjs` (already generic: read the binding) | none |
| Checks | `tests/docs.spec.ts` (imports `../src/docs/table.js`, `../src/paths`) | app paths |
| Generate hook | remy-auth `project:generate` runs `fumadocs-mdx` | override only in remy-auth |
| Preview probe | `tasks/cf/preview` `/en/docs` | section 3 |

Shape of the move: package exports `./docs` (source factory over a folder the app names, the page
components in `SiteShell`, the ask page and a `handleAsk(env, request)`), `./docs/checks`
(`docsChecks({ table })`); the app keeps thin route files (one line each, as its pages already are)
and a `docs/` folder. Tasks: `tasks/docs.toml` plus `tasks/docs/publish`, `docs/questions`,
`docs/create` reading `DOCS_BUCKET`, `DOCS_INDEX`, `DOCS_GATEWAY` from `[env]`, defaulting to
`<worker>-docs`, `<worker>-docs-pages`; `docs/create` makes the bucket, instance and gateway with the
spend limit the owner sets per consumer (`cf:ai-gateway` already changes it). Size L (3-5 agent
days), after the D-items, because it needs D4 and D12 patterns. Owner decision needed: spend limit
per consumer, and whether remy-auth-app answers at all or only shows docs.

## 5. Scripts: keep or replace

No `scripts` in either `package.json` (checked): mise owns them already.

| Script | Run by | Verdict |
| --- | --- | --- |
| `tasks/cf/preview` (bash) | `cf:preview`, `project:test:cwv` | **Keep**: build, deploy under another name, wait, test, delete is a sequence with a trap; no mise feature or Wrangler command does it. Fix the `/en/docs` probe. The inline `node -e unstable_readConfig` for the name is fine |
| `tasks/cf/preview-delete` (bash + inline node) | `cf:preview`, `cf:preview-delete` | **Keep** the delete (`wrangler delete --name --force`, upstream). The listing uses Cloudflare's API because Wrangler has no list-Workers command; keep. Drop `${1:-…}`: mise passes `usage_name` |
| `tasks/cf/wait` (node) | `cf:deploy`, `cf:preview` | **Keep**: polls `/healthz` for the version in Wrangler's output file; mise `wait_for` waits on tasks, not URLs |
| `tasks/cf/deploy` (bash) | `cf:deploy` | **Keep**, simplified: `GATE=1` is a shell condition; replace the `mise tasks info docs:publish` probe with a `project:after-deploy` hook task |
| `tasks/cf/urls` (node) | `cf:urls` | **Keep**: reads the package's paths and Paraglide runtime |
| `tasks/cf/events`, `ai-check`, `ai-usage`, `ai-gateway` (bash wrappers) + `observe.mjs`, `gateway.mjs` | `cf:*` | **Keep the modules** (Cloudflare API calls Wrangler lacks). **Replace the wrappers**: they exist "so the module loads as ESM", but `tasks/cf/wait` and `tasks/cf/urls` are extensionless Node file tasks with `import` that already work (Node 26 detects ESM syntax). Each becomes a 3-line `#!/usr/bin/env node` file task importing `./observe.mjs`. Optional, S |
| `tasks/mcp/register` (wrapper) + `register.mjs` | `mcp:register`, `mcp:verify` | **Keep**: writes project `.mcp.json` and `.codex/config.toml` with a `--check` mode. `claude mcp add-json -s project` covers `.mcp.json`, but Codex's CLI writes only the user-level config, so one script stays the clearest home. Wrapper: same as above |
| `tasks/project/upgrade-ui` (bash) | `project:upgrade-ui` | **Keep**; `npm install --save-exact` is upstream, the `sed` of the include ref has no mise command for array entries |
| `tasks/project/test/cwv` (bash) | `project:test:cwv` | **Replace the stdout parsing**: it greps `cf:preview`'s log for the Worker name and origin. Give `cf:preview` a `#USAGE flag "--cwv"` that runs `playwright --project=google-cwv` before its own delete; `cwv` becomes a TOML task `run = "mise run cf:preview -- --cwv"`. S |
| `tasks/api/spec` (node) | `api:spec` | **Keep**: validates OpenAPI 3.1 and prints `--urls`; `curl` alone would lose both |
| `project:test:google` inline `flock`/`lockf` | `tasks/project.toml` | **Keep**: one line, upstream tools |
| `scripts/release.sh` | `ui:release` | **Simplify**: CI's `release` job already publishes "unless already published" and creates the release (`.github/workflows/google.yml`). Local release becomes checks, `git tag`, `git push`; drop the local `npm publish` and `gh release create`, CI does both from the tag. S, but owner decision (local publish was deliberate) |
| `scripts/release-notes.sh` | `release.sh`, CI | **Keep**: one awk, shared by local and CI |
| `scripts/verify-tooling.mjs` | remy-auth `project:verify` | **Split**: lockfile-vs-manifest stays (remy-auth workspace); observability asserts become a shared check (D6); skills-lock part becomes included `skills:verify` (section 3) |
| `scripts/docs-publish.mjs` | `docs:publish` | **Keep** (Wrangler cannot list a bucket); move into `tasks/docs/` with names from `[env]` (item 4) |
| `scripts/docs-questions.mjs` | `docs:questions` | **Keep**, move with item 4. `wrangler ai-search search` does the work; the script only ranks |
| `docs:answers:*` (TOML one-liners) | remy-auth `mise.toml` | Already upstream `wrangler secret`; move with item 4 |

Net: 4 wrappers and the cwv log parsing go; two scripts move; no new scripts.

## 6. mise itself

- Version: installed and pinned `2026.9.12` (`mise --version`; 2026.9.13 is available). The number
  is written three times in remy-auth (`mise.toml` `min_version`, twice in
  `.github/workflows/google.yml` `version:`), and zero times in the consumer (D3). Keep the CI pin
  (reproducible), comment already points at `min_version`; add `min_version` to the recipe.
- Include syntax: `git::https://github.com/joeblew999/remy-auth.git//tasks?ref=v0.10.5`; the most
  specific config's `includes` replaces the default, per `docs/content/dev/tasks.md` (verified there with
  2026.9.12); `MISE_ENV=dev` confirmed to resolve a different task set today.
- Caching: `~/Library/Caches/mise/remote-git-tasks-cache/<hash>/` holds a **full clone of the whole
  repository per ref** (23 clones, 95 MB on this machine), never pruned; a moving ref (`main`) is
  never refreshed unless `MISE_TASK_REMOTE_NO_CACHE=true` (setting `task.remote_no_cache`). Seen:
  remy-auth-app's `MISE_ENV=dev` lists a `cf:deploy` older than `v0.10.5`'s. Add an included
  `project:tasks-refresh` (`MISE_TASK_REMOTE_NO_CACHE=true mise tasks ls >/dev/null`) and say in the
  recipe that `ref=main` is stale by default.
- Offline: `MISE_OFFLINE=1 mise tasks ls` in remy-auth-app lists all 38 lines of tasks from the cache
  (read only; no task was run). Running a task offline additionally needs `node_modules` (all tasks
  call `./node_modules/.bin/*`) and, for `npx skills@1.7.0`, the npx cache.

## Prioritized action list

| P | Action | Size | Where |
| --- | --- | --- | --- |
| 1 | Fix `cf:preview`'s `/en/docs` probe (use `/healthz` or the base-locale home) before tagging 0.10.6 | S | `tasks/cf/preview` |
| 2 | Recipe fixes in the consumer: `min_version`, shell-read `PREVIEW_PORT`, `PUBLIC_ORIGIN` from it, `preview_urls: false`, `redact_query_string`, README refresh | S | `../remy-auth-app/mise.toml`, `wrangler.jsonc`, `README.md` |
| 3 | App name once: package helpers and `observabilityChecks` default to wrangler's `name`; vite derives the prerender name | M | `packages/ui/src/worker.ts`, `tanstack.tsx`, `checks.js`; consumer |
| 4 | Template repo + one recipe in `docs/content/dev/tooling.md` and `docs/content/dev/tasks.md`; prove with a throwaway second consumer made from the recipe alone (the plan's gate) | M | GitHub setting on remy-auth-app; docs |
| 5 | Shared check sets: `prerenderedAppChecks` (D12), immutable-assets and wrangler-observability checks (D6, D7) | M | `packages/ui/src/checks.js` |
| 6 | Package moves: `prerenderPages` (D4), `tailwind.css` (D8), `sitemapXml`/`robotsTxt` (D9), `Problem` (D10) | M | `packages/ui/src/` |
| 7 | Tasks: `project:after-deploy` hook, `skills:verify`, `project:tasks-refresh`, `cf:preview --cwv`, drop the 4 wrappers | S-M | `tasks/` |
| 8 | Reusable CI workflow, called by remy-auth and a consumer workflow | M | `.github/workflows/` |
| 9 | Docs and AI answers into package and tasks, per-consumer names from `[env]`; owner sets each spend limit | L | item 4 |
| 10 | Release simplification (CI publishes from the tag) | S | `scripts/release.sh`; owner decision |

Items 1 and 2 are independent and can run in parallel now; 3, 5 and 6 are parallel package work
released together as one version; 4 follows them (the template should carry the result); 9 last.
