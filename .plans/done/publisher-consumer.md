# Publisher and consumers: check the approach after the big build-up

Closed 2026-09-26: the new-consumer recipe (tasks/README.md), drift fixed and CI in remy-auth-app, package moves (tailwind.css, prerender, seo builders, app-checks) and the consumer contract set (`prerenderedAppChecks`) shipped in remy-ui 0.11.0 with both apps on it. Scripts reviewed ([analysis](publisher-consumer-analysis.md) §5): every script keeps a job no mise feature or upstream command does; the optional tidy-ups there (four wrappers, cwv log parsing, release via CI) are not pursued.

Status: plan for an agent to analyse, then do; 2026-09-25. Owner: "our whole publisher / consumer
approach relies on this". It may turn out that little needs doing; the point is to check.

## The approach today

remy-auth publishes; remy-auth-app is the reference consumer and the proof.
- **Stack:** `@joeblew999/remy-ui` on GitHub Packages (components, blocks, pages, Paraglide
  catalogs and runtime, fonts and text CSS, checks, samples, Playwright config, contract API).
- **Tools and tasks:** consumers include remy-auth's `tasks/` by git ref, pinned to the release tag
  that matches the package (`[task_config] includes`), and set only `[env]` inputs. `MISE_ENV=dev`
  follows main; `mise.local.toml` points at a checkout.
- **Skills and MCP:** pinned skills and MCP registration come through the included tasks
  (`skills.toml`, `mcp.toml`); both repos have the same `.claude/skills` set.

## What to check

1. **What a new consumer gets, end to end.** From an empty repo: `mise.toml` with the include,
   `npm install`, the tasks, skills, MCP, and a deploy. List every hand step and every file it had
   to copy. Measure against remy-auth-app, then write the steps into the consumer section of
   `docs/tooling.md` (or the package README) as the one recipe.
2. **Drift.** Anything in remy-auth-app that duplicates or overrides the publisher (tasks,
   `vite.config.ts`, `playwright.config.ts`, `wrangler.jsonc`, `_headers`, CSS imports, check
   calls). Each is either moved into the package or tasks, or recorded as the consumer's own.
   The consumer's `tests/gui.spec.ts` should be one line per shared check set (queue item 14).
3. **More into the include.** Candidates: the build, preview, deploy and wait chain (already
   there), `project:upgrade-ui`, level-2 audits, the language tiers
   ([language-test-tiers.md](language-test-tiers.md)), the docs tasks below, and the CI workflow
   (a reusable GitHub workflow in remy-auth, called by consumers, [ci-node24.md](ci-node24.md)).
4. **Docs and AI answers for every consumer.** Today the docs engine lives in remy-auth's app code
   (`src/docs/`, `/docs` and `/app/ask` routes, `docs:index`). A consumer gets nothing. Move the
   reusable half into the package and tasks: the Fumadocs source over a consumer's own Markdown
   folder, the docs pages in SiteShell, the ask page and endpoint, `docs:index`, and the checks.
   Each consumer brings its Markdown and its **own** AI Search index, AI Gateway and spend limit
   (created by a task, named after the app), so costs and content stay separate. The owner decides
   the spend limit per consumer. remy-auth-app gets a small docs folder as the proof.
5. **Fewer scripts.** Inventory every script the tasks run (`scripts/*.sh`, `scripts/*.mjs`,
   `tasks/**/*.mjs`, file tasks). For each: is there a tool or mise feature that does it (mise
   `usage` args, `depends`, `wait_for`, `sources`/`outputs`; `gh release`, `wrangler`, `npm`
   commands)? Replace where the result is simpler and upstream-owned; keep a script only where it
   is the clearest home, and say why in one line. No npm `scripts` in `package.json`: mise owns them.
6. **mise itself.** Pin and check the mise version consumers need (`min_version`), the include
   syntax and caching of git includes, and that `mise run` from a consumer works offline once
   fetched.

## Gates

A second, throwaway consumer made from the recipe alone passes the shared checks and deploys to a
preview; remy-auth-app passes its gate and Core Web Vitals after any move; no check is loosened.

## Decisions

- 2026-09-25, package moves (analysis D4, D8, D9, D12; D10 `Problem` was already in `./problem`):
  `./tailwind.css`, `./prerender` (`prerenderPages`, its own module so `paths` stays import-free
  data), `seo`'s `sitemapXml`/`robotsTxt`, `./app-checks` (`serverAppChecks`,
  `prerenderedAppChecks`, taking the app's own pages as `ownSitePaths`/`ownAppPaths`). The check sets
  live beside `checks.js`, not in it, because the showcase checks import `checks.js`. remy-auth uses
  them with the same CSS bytes, sitemap and robots output and the same 276 registered checks.
  remy-auth-app moves after the next release (it installs the package from GitHub Packages).
- 2026-09-25, package moves meet parts (parts second pass, [parts.md](parts.md)): one design. The
  seo-routes part's `/sitemap.xml` and `/robots.txt` are built with `seo`'s `sitemapXml`/`robotsTxt`
  (no second builder; a prerendered consumer writes its files with the same functions);
  the status-card part wraps `showcase/status-card`; `serverAppChecks` takes `parts` (default: the
  app's `src/parts.json`) and leaves what a listed part owns to `partChecks()`. remy-auth's test file is
  `serverAppChecks` + `partChecks` + its own checks; every registered test title survives (the sitemap
  and 404 test split in two, the Cloudflare rows became a no-JavaScript test per language).
- `cf:preview-delete` keeps `${1:-…}`: `cf:preview` calls the file directly, not through mise, so
  there is no `usage_name` there (the analysis's "drop it" would break the cleanup).

- 2026-09-25, recipe and consumer drift (analysis action list items 2 and 4, D2, D3, D6, D15,
  D16): the new-consumer recipe has **one home**, [tasks/README.md](../../tasks/README.md#a-new-consumer)
  (docs/tooling.md already links there); it starts from remy-auth-app as a GitHub template repository
  (`gh repo create --template`), no scaffolding script of ours. remy-auth-app (branch
  `consumer-drift-recipe`) now has `min_version`, `PREVIEW_PORT` from the shell with `PUBLIC_ORIGIN`
  following it, `preview_urls: false`, `redact_query_string`, a `google.yml` workflow (types and
  Lighthouse audits on push to main, actions pinned by SHA, no release job) with Dependabot, and a
  refreshed README; its package stays on 0.10.5 until the release. Checked with typecheck and build
  only (owner: no test tiers). Still open: the shared wrangler-config check (D6, item 5), the name
  written once (D1, item 3), the reusable workflow (item 8; the consumer's copy becomes a caller),
  and the gate's throwaway second consumer.
- Owner to do: mark remy-auth-app a template repository (GitHub setting) and grant it read access
  in the `@joeblew999/remy-ui` package's "Manage Actions access", or its CI's `npm ci` fails.
