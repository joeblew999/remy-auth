# Thin apps: every Remy repo gets the platform with as little boilerplate as possible

Status: agreed 2026-09-29; phases 0, A, B and C done 2026-09-29, phase D prepared and waiting for the owner. Owner: remy-auth. Built and proved in remy-auth first, with no
release until phase D; remy-video (`../remy-video`, tasks and remy-ui 0.13.0) is the evidence. It is
not migrated (owner, 2026-09-29: "its so bad we will have to make a new one and then copy the real bits
out of it later"). Phase D proves the platform with a new repo, `remy-auth-test` (owner, 2026-09-29: "for
Phase D, just use remy-auth-test. dont worry about the video aspects for now"); the video repo comes
later, outside this plan. Executor/Reviewer roles as in
[plans and roles](../docs/content/dev/development.md#plans-and-roles).

## Intent

Owner, 2026-09-29: "Remy-video and others are not meant to have to have so much boilerplate. the idea
of that all our remy repos will get all the same things with as few a boilerplate as possible."

The platform (the shared package and tasks) lives in remy-auth; every Remy repo, remy-auth included,
is a thin product on it. A repo holds only what makes it that product:

- identity: name, brand, origins, Worker and AI Search names;
- its routes and pages, its API contract and procedures;
- its docs content and its strings.

Everything else arrives from shared pieces and is upgraded by one version bump
(`project:upgrade-ui`): tasks, app shell and frame, providers, problem pages, checks, the whole docs
system, i18n wiring, CSP, dependency pins, CI, agent docs and skills.

Owner, 2026-09-29: "all of the docs stuff should be part of this. Each repo then gets what remy-auth
has." Parity is the bar: whatever remy-auth has, a new repo has by including the tasks and the package.
Parity of capabilities, not pages (owner, 2026-09-29): every repo gets the same machinery; remy-auth's
own pages (formats, clock, demo, location) stay remy-auth's product.

A repo may also publish packages of its own, as remy-video does with `remy-video-ui` and
`remy-video-contract` (owner, 2026-09-29: supported). Being a package owner must cost no more
boilerplate than being a consumer (group 6).

One layout, different contents (owner, 2026-09-29: "all other Remy projects use the same file folder
layout. BUT the code and content is of course different inside some of them"). Every repo, remy-auth
included:

The layout is the paths the shared tasks, their scripts and the package already expect (owner: "the mise
tasks and tools expect certain paths too"). A first grep of `tasks/`, 2026-09-29:

| Path | Read by | Contents per repo |
| --- | --- | --- |
| `mise.toml` (the include, `[env]`), `package.json` (workspaces), `package-lock.json`, `wrangler.jsonc`, `vite.config.ts`, `playwright.config.ts`, `tsconfig.json`, `fnox.toml`, `skills-lock.json` | mise, npm, wrangler, vite, playwright, tsc, fnox, `skills:*` | same shape, different names |
| `src/routes/`, `src/routeTree.gen.ts` (generated), `src/api/` | TanStack Start, `project:check` | the product's pages and procedures |
| `tests/` (`smoke.spec.ts` named by the tasks) | `project:test:*` | the shared checks with the repo's config, plus its own |
| `public/`, `dist/` (build output) | vite, wrangler, `cf:*` | favicon and headers; generated |
| `docs/` (`wrangler.jsonc`, `tests/`, `dist/`), `docs/content/{users,dev,ui}/` with `i18n.json` and `meta.json` | `docs:*`, `i18n:docs:*` (`I18N_DOCS_DIR`) | the docs' identity and pages |
| `project.inlang` (`I18N_INLANG`) | `i18n:messages:*` | the repo's own strings, if any |
| `packages/<name>/` with `README.md` | `plans:*`, owner tasks (group 6) | packages the repo publishes, if any |
| `.plans/` (`now.md`, `done/`, `parked/`) | `plans:*` | the repo's plans |
| `AGENTS.md` (rules block), `.github/workflows/` | agents; GitHub | same shape |
| `tasks/` | the include | remy-auth only: the platform itself |

Phase A turned this grep into the full inventory (tasks, their scripts and the package's own path
reads, adding `src/parts.json` and `dist/client/assets`) and wrote it once in
[tasks.md, "The layout"](../docs/content/dev/tasks.md), the one home; the table above is the first
grep, kept as history. The layout is kept by the tools, not by a checker of our own (the `project-layout` branch was
not merged for that reason, now.md step 1): a file elsewhere is simply not found. remy-auth and
remy-video already match it; remy-auth-app does not yet (`workers/` for its prerender Worker, no
`docs/`), which phase D settles with the open question on its future. The blank app (group 7) is this
layout with nothing product-specific in it.

Rules for every fix in this plan:

1. **Config, not copies.** A shared piece takes the app's routes, brand and content as input. A fork
   in an app is a bug in the platform.
2. **Packages, not templates.** Nothing is scaffolded that an upgrade cannot reach. `docs:init`
   copying 61 files is the pattern to remove, not extend. Better docs or a scaffold task do not count
   as a fix: they document or generate the boilerplate instead of removing it.
3. **Proved here, then adopted.** Owner, 2026-09-29: "by doing it at the remy-auth level, then its easy
   for all other repos. and we prove it here and not have to work on both remy-video and remy-auth at
   the same time." remy-auth consumes each shared piece exactly as another repo would (through the
   package's exports and config, no reaching into its sources), so remy-auth itself is the proof.
   Existing repos that are sound move afterwards, one `project:upgrade-ui` each (remy-auth-app);
   remy-video is replaced instead.
4. **Measured by deletion.** Each phase ends with remy-auth's own copies deleted and its gates green;
   the scratch check (risk 2) shows how little a new repo needs.

## Evidence: remy-video today

Two field reports, drafted in remy-video:
[remy-auth-feedback.md](https://github.com/joeblew999/remy-video/blob/main/.plans/done/remy-auth-feedback.md) (16 items: tasks, packages,
app) and [remy-auth-docs-feedback.md](https://github.com/joeblew999/remy-video/blob/main/.plans/done/remy-auth-docs-feedback.md) (7 items:
the docs Worker). They read as asks for docs and scaffolds; this plan reads them as places the
platform leaks. Decided 2026-09-29 (owner delegated: "you decide"): closed against this plan, not
posted as issues; the table below is their one home, so no fix is tracked twice.

Hand-maintained lines outside docs content, lockfiles, media and generated route trees, 2026-09-29:

| Area | Lines | Files | Product-specific in it |
| --- | --- | --- | --- |
| Docs Worker (`docs/`, from `docs:init`) | ~2,200 | 61 | `docs.config.ts`, names in `wrangler.jsonc`, the contract import |
| Video UI package (`packages/ui`) | ~620 | 13 | `video.ts`, the video cards in `pages.tsx` |
| App (`src/`) | ~400 | 26 | the `videos*` and `app.videos` routes, `api/router.ts` |
| Root config (mise, package.json, vite, tsconfig, wrangler, playwright, release scripts, CI) | ~360 | 10 | origins, names, the package list |
| Contract (`packages/contract`) | ~100 | 3 | all of it |

Roughly 3,700 lines, of which a few hundred are video. The target is the few hundred: `remy-auth-test` in
phase D has none of the video, so everything it writes by hand beyond its identity and one page is
boilerplate, and it is measured against the non-video rows of this table.

The real bits, for the later video repo (outside this plan; everything else is platform or goes):

- `packages/ui/src/video.ts` (schemas and formatting) and the video pages in `pages.tsx`
  (`VideoHomePage`, `LibraryPage`, `LibrarySkeleton`, `PlayerPage`, `HomeCard`, `formatDuration`);
- `packages/contract/src/index.ts` and its README;
- `src/api/router.ts` (the procedures) and the routes `videos.tsx`, `videos_.$videoId.tsx`,
  `app.videos.tsx`, with the home and app home pages' video content;
- `docs/content/` (users and dev pages, English and Spanish), `docs.config.ts`'s values;
- names and origins: `mise.toml`'s `[env]`, the `wrangler.jsonc` names, `fnox.toml`, `public/favicon.svg`.

### remy-auth-app, checked 2026-09-29

The other consumer (remy-ui and tasks 0.13.0) is already thin: about 800 hand-written lines, no docs
Worker, no forks. But it proves less than it seems:

- It is a second host of remy-auth's own showcase pages (formats, demo, clock, location, account,
  settings), rendered from the package's `pages`, `app-pages` and `showcase/*` exports and prerendered.
  Its routes are the ones the shell hardcodes, which is why it never met A6 to A8.
- It is the starting point for every new repo ([tasks.md, "A new consumer"](../docs/content/dev/tasks.md):
  `gh repo create --template joeblew999/remy-auth-app`, then rename in six files). A new repo therefore
  starts with remy-auth's showcase pages and a rename checklist: remy-video began there.
- Its `AGENTS.md` links remy-auth's `docs/development.md` and `docs/tooling.md` on GitHub `main`; both
  404 since the docs moved to `docs/content/dev/`.

What follows, folded into the groups below: the showcase pages stay package exports that remy-auth and
remy-auth-app opt into, and the shell no longer assumes them (group 1); remy-auth-app does not test the
abstraction, because it shares remy-auth's routes, so the scratch new app does (risk 2); a new repo
starts from a blank app, not from the showcase (group 7, phase D); the `AGENTS.md` rules block replaces
the dead links (group 2).

### Every item in the two reports, and where this plan answers it

App report (A, [remy-auth-feedback.md](https://github.com/joeblew999/remy-video/blob/main/.plans/done/remy-auth-feedback.md)):

| Item | What remy-video hit | Answered by |
| --- | --- | --- |
| A1 | No path for a repo that also owns packages | group 6 |
| A2 | `project:setup` fails with npm's error when `package.json` is missing | group 7 |
| A3 | Dependency list copied from remy-auth-app's `package.json` | group 3 |
| A4 | TanStack devtools packages required but unlisted | group 3 |
| A5 | `@tanstack/query-core` installed twice, cryptic `tsc` errors | group 3 |
| A6 | Shell and pages hardcode remy-auth's routes | group 1 |
| A7 | Sidebar and bottom-nav blocks not exported | group 1 |
| A8 | `AppProviders` and `Problem` pull the shell into typecheck | group 1 |
| A9 | Message catalog has no extension point | group 6 |
| A10 | Deep imports refused by export maps, misleading error | group 4 |
| A11 | Zod's eval probe against the nonce CSP | group 5 |
| A12 | `publicPageChecks` asserts remy-auth's home copy | group 4 |
| A13 | `videos.$videoId` nests under `videos` (TanStack's rule) | the app's own route, not the platform; a note in the consumer docs (group 7) |
| A14 | Language hint needs `preferred` threaded by hand | group 1 |
| A15 | `tasks/README.md` does not name its source | done before this plan: it links `docs/content/dev/tasks.md` |
| A16 | Export-map example, `Env` before `wrangler types`, coverage rule, task refresh, port clash | group 5 (`Env`), group 6 (export map of an owned package), group 7 (the rest) |

Docs report (D, [remy-auth-docs-feedback.md](https://github.com/joeblew999/remy-video/blob/main/.plans/done/remy-auth-docs-feedback.md)):

| Item | What remy-video hit | Answered by |
| --- | --- | --- |
| D1 | Post-`docs:init` checklist is one sentence | group 2 (nothing left to customise but config) |
| D2 | Template `tsconfig.json` path mapping breaks typecheck | group 2 |
| D3 | `mdast-util-to-markdown@2.1.3` overflows on bold; `overrides` ignored | group 3; remy-auth is on 2.1.2 today (one copy), so reproduce by moving it to 2.1.3, then report upstream |
| D4 | `docs.spec.ts` hardcodes remy-auth's pages | group 2 |
| D5 | No guide to replacing content, languages | group 2 |
| D6 | `i18n:*` needs a git repository | group 7 (`project:setup` precondition) |
| D7 | What worked | kept |

## Groups, in order

Each group names what remy-video had to write that a new repo will not, and the report items it answers
(A = app report, D = docs report).

### 1. App chrome takes the app's routes (A6, A7, A8, A14)

Removes: `packages/ui/src/shell.tsx` (204), `problem.tsx` (46), `app-pages.tsx` (36), most of
`pages.tsx`; the forked `AppProviders`/`SourceLink`.

- `Shell`, `SiteShell`, `AppShell`, the sidebar and bottom-nav blocks and the problem pages read the
  nav from the app (the `SiteNavLinks`/`AppNavLinks` context or a typed config), not from remy-auth's
  page list. Type errors inside `node_modules` for another app's routes must be impossible.
- Context and `AppProviders` live in modules with no route imports.
- The shell reads `preferred` itself, so no page can forget the language hint.
- The blocks are exported or folded into `AppShell`; no consumer rebuilds the frame from primitives.
- remy-auth's own pages become its config, the same way any repo's are. The showcase pages
  (formats, demo, clock, location, account, settings) stay package exports; remy-auth and remy-auth-app
  opt into them through that config, and an app that does not gets none of their links or types.

### 2. The whole docs system is shared (D1, D2, D4, D5)

All of it, so each repo gets what remy-auth has: the three sites (`/docs`, `/dev`, `/reference`
from the repo's own contract), search, Ask AI over AI Search, an MCP server per site, `llms.txt` and
`.md` pages, page actions, OG images, the `docs:*` tasks, docs translation through `i18n:docs:*`, and
the channels to agents
(the `remy` skill and the `AGENTS.md` rules block). This group takes over what is still open in
[docs-for-consumers](docs-for-consumers.md) (its plan of work and "the shared docs part") and step 5 of
[now.md](now.md); that plan stays as the research and decisions behind it.

Already shared, checked 2026-09-29: the `docs:*` tasks (`tasks/docs.toml`: dev, build, check, test,
preview, deploy, publish, cli, answers, init) and `i18n:docs:check`/`translate`. Not yet: `docs:observe`
and `docs:ai-gateway` run as file tasks from the docs app's own `docs/` folder, the `remy` skill and the
`AGENTS.md` block (`skills:install` exists; no skill is built), and provisioning.

Owner, 2026-09-29: "for the docs system remy-auth will really only need the mdx, and maybe one or two
other code or config files." remy-auth's `docs/` (61 code and config files beside 38 content files
today) is the first consumer of the docs package.

What stays in a repo's `docs/` (owner: "is this realistic though"; settled by phase 0, tests 1 to 3):
`content/` and four small files the build tools read from the app: `docs.config.ts`, `package.json`,
a one-line `vite.config.ts` (`export default remyDocs(docsConfig)`, which also gives the Cloudflare
plugin the Worker config, so no `wrangler.jsonc`) and a one-line `tsconfig.json` extending the
package's. The ~2,000 lines of our glue move without trouble.

Routes were the one unknown; phase 0 settled them: TanStack Start's `srcDirectory` points at the
package's `src/`, so a repo's docs hold no routes and no Worker code (verdicts above).

- The Worker's routes, components, handlers, Ask AI, MCP, `llms.txt` and tests ship in a package
  (or the UI package) and take `docs.config.ts` and the contract as input.
- Ask AI and AI Search are part of every repo's docs (owner, 2026-09-29: "every repo gets ask AI and AI
  search. Its still very beta ... definitely part of this. we can not run it though for now"): opt-in
  in `docs.config.ts`, built and tested locally, not switched on or provisioned for any repo in this
  plan.
- Provisioning each repo's own AI Search instances, R2 bucket and Gateway comes from `docs.config.ts`
  through shared tasks, not by hand; written and dry-run only here (risk 8).
- The agent channels: the `remy` skill ships in the package and `skills:install` puts it in each repo;
  `AGENTS.md` carries a generated rules block pointing into `node_modules`, pinned by the package
  version (docs-for-consumers, "Recommendation"). A repo's own docs feed its own MCP and `llms.txt`.
- Tests derive their page lists from `meta.json` or the sitemap, never from remy-auth's paths.
- No path mapping in a consumer's `tsconfig.json`.
- `docs:init` shrinks to writing the config and an index page, or goes.

### 3. One dependency set, owned by the platform (A3, A4, A5, D3)

Removes: most of remy-video's `package.json` and `docs/package.json`, and the pins found by
debugging (`@tanstack/query-core`, `mdast-util-to-markdown`, the devtools packages).

- The tooling an app needs comes from the platform at one version (a dependency of the package, or a
  manifest versioned with the tasks that `project:upgrade-ui` applies). Survey first; the answer must
  survive npm's hoisting, which silently ignored `overrides` in remy-video (D3).
- A gate asserts one copy of the packages that break when duplicated.

### 4. Checks split into structure and content (A12, A10)

Removes: remy-video's `checks.js` workarounds and the dropped narrow-screen, RTL and font coverage.

- `publicPageChecks` keeps the structural checks and takes brand, title and description as options;
  remy-auth's home-page copy becomes remy-auth's own check.
- Helpers a check author needs are exported subpaths; no deep imports.

### 5. Shared runtime defaults (A11, A16)

- Zod's `jitless` set once in a shared module every schema imports, not in one demo file.
- The `Env` types an app needs before its first `wrangler types`.
- Anything else found while doing groups 1 to 4 that every app writes the same way (`src/server.ts`,
  `start.ts`, `csp.ts`, `csp-report.ts`, `robots`, `sitemap`, `api.$`, `router.tsx`, `__root.tsx`):
  check each against the package's existing `start`, `cloudflare`, `csp-report` and `tanstack` exports.

### 6. Repos that also own packages (A1, A9)

Removes: remy-video's copied owner tasks in `mise.toml` (`packages:*`, `project:verify`,
`project:doctor`, `ui:*`), `scripts/release*.sh`, and the hand-copied CI workflow.

- The owner tasks and release go into the shared tasks, driven by the workspace's package list. Token
  setup for publishing from any `joeblew999/remy-*` repo is agreed (owner, 2026-09-29); the shared
  tasks and tools already do it.
- A second package's strings: its own catalog through the shared i18n tasks, one documented stanza.

### 7. What stays small (A2, A13, A16, D6)

Preconditions in `project:setup` (a `package.json`, a git repository), the task refresh alias, a clear
message when the preview port is taken, the contract coverage rule and TanStack's `_` sibling-route
rule in the consumer docs: fold into whichever group touches the file; not steps of their own.

The starting point for a new repo: a blank app (identity config, one home page, no showcase), not a
copy of remy-auth-app. It is a template, and rule 2 still holds: it holds only files that are the repo's
own from the first commit (identity, an empty home page and docs index, the layout's config files at a
few lines each), nothing the platform must later reach. The scratch new app of risk 2 becomes it at the end of phase C, and the "A new
consumer" recipe in tasks.md points to it; its rename step shrinks to the identity config.

## Working rules for this plan: unattended

Owner, 2026-09-29: "i want this all able to be done unattended !!! so ask me if you need to now".
Decided with the owner the same day:

- **Acceptance without the owner.** A phase is accepted when its gates, the scratch check and the
  hands-on preview pass are green and a separate reviewer agent, reading only this plan and the phase's
  diff, finds no blocking issue. The verdict is recorded here and the next phase starts. A failed phase 0
  test: the Executor re-plans that phase, records why, and continues.
- **What goes out without the owner:** merging an accepted phase to main, nothing else. A push to main
  runs only the Google checks in CI (`.github/workflows/google.yml`; no deploy, releases are for tags).
  Not without the owner: production deploys of remy-auth, `ui:release`, creating or deploying
  `remy-auth-test`, and moving remy-auth-app. So phases 0 to C run unattended and phase D stops before
  its first outward step, with everything prepared.
- **Blockers** outside these decisions (a cost, an irreversible step, a real blocker): parked in this
  plan and now.md, that part skipped, everything else finished, and the list sent to the owner as a
  notification at the end.
- **The checkout is the Executor's:** no other session works in remy-auth's main checkout during the
  plan. The stale worktrees (`fumadocs-trial`, `project-layout`, `wf_0e57b9eb-956-1`, `-956-2`) are
  removed after checking nothing in them is unmerged; `agent-aca0ff9fa382158ea` (the Look work) stays.
- The work lives on a `thin-apps` branch in its own worktree; previews (`cf:preview`) are how the hands-on
  pass sees it.
- Design details inside a phase: the Executor decides and records each decision and why here.
- Dependency freeze for the plan's length: no `packages:upgrade`, oRPC stays on 1.15.4.

## Phase 0: settle the unknowns first (scratch only, nothing on main)

Each test is a throwaway folder with a one-line verdict written here; a failure re-plans its phase
before that phase starts.

| # | Test | Settles | For |
| --- | --- | --- | --- |
| 0 | tier 3 and `docs:test` on main as it is | the baseline, so old failures are not blamed on the plan | all |
| 1 | TanStack virtual routes or `routesDirectory` into a package | whether a repo needs route files | B |
| 2 | Fumadocs MDX with content in the app and code in a package | whether the docs can be a package | B |
| 3 | Cloudflare's Vite plugin `config` without `wrangler.jsonc`, build and deploy | whether that file goes | B |
| 4 | Package dependencies against peers against a manifest under npm's hoisting, reproducing A5 and D3 | group 3's approach | C |
| 5 | A second Paraglide catalog beside remy-ui's | group 6's strings | C |
| 6 | `skills experimental_sync` with a skill shipped in the package | the agent channel | B |
| 7 | A blank app from the locally packed package: install, typecheck, build | that the scratch check itself works | all |

Verdicts, 2026-09-29 (scratch: a copy of the docs Worker's `src/` as a real directory in
`node_modules/@joeblew999/remy-docs`, an app holding only `content/`, `docs.config.ts`, `vite.config.ts`,
`tsconfig.json`, `package.json`):

- **0, baseline: green.** Tier 3 81/81, `docs:test` 7/7 on main (`c6448d0`). Known and not ours: docs
  dev logs React "reading 'useContext'" twice (seen on main's own docs Worker too), and Ask AI logs
  "needs to be run remotely" locally.
- **1, routes: pass, better than expected.** No routes and no Worker code in the app: TanStack Start's
  `srcDirectory` points at the package's `src/` (router, start, server entry, routes); the route tree
  is generated there. The preview serves `/docs`, `/docs/es`, `/dev`, `/reference`, `llms.txt`,
  `.md`, sitemap, robots, social images (at the URL pages link, `/og/docs/formats/image.webp`), MCP and
  search; dev serves `/docs`, `/dev/how-we-work`, `/reference` and `llms.txt`.
- **2, Fumadocs as a package: pass, with two changes.** (a) fumadocs-mdx's macro never compiles
  `node_modules` (its `include` cannot override that), so the preset writes the 10-line
  `collections.ts` into the app's generated, gitignored `.remy-docs/` at config time. (b) The ~15 imports
  from the Worker into the app (`docs.config.ts`, `content/**/i18n.json`, `meta.json`, `content/ui/*.json`)
  go through one alias, `@remy-docs-app/`, set by the preset for Vite and by the package's
  `tsconfig.json` for TypeScript with `${configDir}`, so the app's `tsconfig.json` is one `extends` line
  and has no paths of its own; typecheck 0 errors (confirmed again by the reviewer). The package's own `@/` imports become relative.
  Content that points at Worker source (the "Writing docs" type table, `../../src/docs/source.server.ts`)
  moves to the package path; remy-auth's `CHANGELOG.md` include stays the app's.
- **3, no `wrangler.jsonc`: pass.** The Cloudflare plugin's `config` option replaces the file: the build
  emits `dist/server/wrangler.json` and `.wrangler/deploy/config.json`, and `wrangler deploy --dry-run`
  reads it with its bindings. Other wrangler commands (types, tail, the `ask` environment) then take
  `-c dist/server/wrangler.json` or the preset's config; phase B folds that into the shared tasks.

So a repo's `docs/` is `content/` plus `docs.config.ts`, `package.json`, `vite.config.ts`
(`export default remyDocs(docsConfig)`) and `tsconfig.json` (one `extends`): four files, not five.
- **4, one dependency set: direction settled, design in phase C.** npm's `overrides` works: with
  `"@tanstack/query-core": "5.103.2"` the tree holds one copy, marked overridden (remy-video's "ignored"
  was most likely a stale lockfile). An app that lists only `@joeblew999/remy-ui` gets React and the
  package's own dependencies but not TanStack Router, Start or Query (the package marks them optional
  peers, like `@playwright/test` and `lighthouse`) nor the toolchain (Vite, wrangler, Tailwind,
  TypeScript: not declared at all). So
  phase C ships the pins and overrides from the platform and makes `project:setup`/`project:upgrade-ui`
  apply them; no blocker.
- **5, a second catalog: pass.** A second Paraglide project compiled on its own follows remy-ui's
  language with one call, `overwriteGetLocale(() => remyUi.getLocale())` (en, es, ar checked); it
  delegates, so it holds on the server too. Phase C ships that call as a helper.
- **6, the skill in the package: pass, simpler than planned.** The pinned `skills` 1.7.0 plain `add`
  takes a folder in the installed package (`./node_modules/@joeblew999/remy-ui/skills --skill remy`):
  Codex gets `.agents/skills/remy`, Claude a link in `.claude/skills/`, and `skills-lock.json` records the
  local source and a content hash, so a new package version shows as a changed hash. No
  `experimental_sync`.
- **7, the scratch new app: pass, and it catches the real problems.** `ui:pack` → a new app installing
  the tarball (no GitHub token: the package needs only public npm) with the tasks included from the local
  `tasks/` (every shared task listed) → `project:check`: the build passes and the typecheck fails with exactly A6
  (`node_modules/@joeblew999/remy-ui/src/shell.tsx`: `"/formats"`, `"/app"` not assignable) and A5 (two
  `query-core` copies breaking `src/router.tsx`). The check sees remy-video's problems before any
  release.

Found on the way, for the phases:

- remy-auth's root `tsconfig.json` also maps `@joeblew999/remy-ui/*` to `./packages/ui/src/*`, not only
  `docs/tsconfig.json`: phase A removes both (risk 10).
- remy-auth already mounts package routes through TanStack's `virtualRouteConfig` (`remyParts`, the
  parts): the same mechanism groups 1 and 2 build on.
- A stray tracked file from an unexpanded shell variable, `docs/$S/ask-phone.png`, in remy-auth and in
  remy-video: removed in group 7.

Phase 0: done 2026-09-29; every phase keeps its shape, with group 2's floor down to four files and
risk 10 covering both tsconfig mappings. Accepted by the reviewer agent (ACCEPT; its six non-blocking
notes folded in above; its sixth: the docs spike linked remy-ui from the workspace, and test 7 covers
the packed path).

## Out of scope

Settled 2026-09-29, to keep this plan to what it is for:

- New capabilities. Parity is with what remy-auth has today; the auth service, Better Auth and the
  portal stay [parked](parked/).
- Tool swaps: Cloudflare's `cf` CLI, Flue and one `remy` CLI stay parked ([cf-cli](parked/cf-cli.md),
  [flue](parked/flue.md), [remy-cli](parked/remy-cli.md)); this plan moves code, it does not change
  tools.
- Translation work and the developer-docs cleanup (content, not structure; risk 7).
- Migrating remy-video (replaced in phase D) and moving other repos (remy-data, remy-sport, remy-nash,
  remy-auth-app-layout) before phase D is done.
- Running provisioning, which stays the owner's (risk 8).
- The video repo that replaces remy-video: after this plan, from the real bits listed above.

## Risks, and what closes each (2026-09-29)

Owner: "I see risks !!" then "work out what to do to close the risks". Each risk has a fix built into
the phases below; none is left to care alone.

| # | Risk | What closes it |
| --- | --- | --- |
| 1 | Size: ten steps is "big feature stuff", the kind of plan that turned now.md into a mess | Phases, each with an acceptance (gates, scratch check, reviewer agent) before the next starts, and phase D stopping for the owner. A phase that runs over is stopped and re-planned, not stretched |
| 2 | The wrong abstraction: config designed around remy-auth breaks the next app | Three users at every phase end: remy-auth, remy-auth-app and a new app. remy-auth-app shares remy-auth's routes and showcase pages, so it checks that nothing breaks, not that the design is general; the new app checks that. The package is packed locally (`ui:pack`, nothing published); a scratch copy of remy-auth-app moves onto it, and a scratch new app is built from nothing with it, holding only product code (one page and one procedure, the shape of `remy-auth-test`). Both take the tasks from the local `tasks/`, typecheck and build. No repo is changed; the scratch apps check the design, and the new one counts its own hand-written files. A shape that needs remy-auth-only escape hatches is changed before the phase ends |
| 3 | Owning the wrapper: every Fumadocs or TanStack Start upgrade becomes ours, for every repo | The wrapper keeps Fumadocs' TanStack Start template's file layout and records the template version it follows; an upgrade is that template's diff applied once, in the package. Fumadocs and Start are pinned exactly in one place, and `packages:upgrade` in remy-auth is the only way they move |
| 4 | Breaking the live sites | No production deploy happens in this plan without the owner (working rules). Other repos pin release tags, so a bad release reaches them only when they upgrade. remy-auth does not pin: it uses the package through the workspace (`"@joeblew999/remy-ui": "*"`, a symlink to `packages/ui`), so every change reaches it at once, before any release. That makes remy-auth the canary, and its guard is the deploy rule: its Workers deploy only after `mise run cf:preview` and the hands-on pass, `GATE=quick` for shared-package changes, never mid-phase from a half-moved state. Rollback is the previous Worker version (`wrangler rollback`) and, for other repos, the previous tag |
| 5 | Churn: a release and an upgrade per step, each able to break consumers | No releases while the plan runs (owner, 2026-09-29: "you dont have to do releases? you can code the shared system and refactor remy-auth as you go"). remy-auth runs the package's and `tasks/`'s current source through the workspace, so the shared system and remy-auth change together in the same commits. Other repos stay on their pinned 0.13.0 and meet the new shape once, in phase D. Checking against them needs no release either (risk 2) |
| 6 | The docs routes test fails | It runs in phase 0, before phase B starts, with a fixed decision rule: pass means no routes in a repo; fail means the fallback (one-line re-export files, generated by the platform, never edited) is written into the plan with its file count before phase B starts |
| 7 | Clash with the queued developer-docs cleanup | None in fact: the docs system moves code, and content stays in each repo's `docs/content/`. The cleanup can run before, during or after |
| 8 | Provisioning costs money and needs the owner | Provisioning tasks print what they would create and stop, unless run by the owner with an explicit flag. They are owner-only in now.md, like the alert rule |
| 9 | remy-video drifts while it waits | remy-video is frozen: its now.md says it will be replaced and lists the real bits to copy. Its replacement comes after this plan; until then, product work goes into its real bits only |
| 10 | remy-auth reaching past the exports without noticing: the workspace symlink and the `@joeblew999/remy-ui/*` → `packages/ui/src/*` mappings in the root `tsconfig.json` and `docs/tsconfig.json` let it import files no other repo can | Both mappings go in phase A. Rule 3 is then checked, not trusted: the scratch check in risk 2 installs the packed package, so an import that only works through the workspace fails there before release |

## Phases

While coding: tier 0 (`project:check`, which runs `docs:check`), nothing slower. Each phase ends with
remy-auth using the new pieces only through their exports, its own copies deleted, tier 3
(`project:test:quick`, the tier for shared-package changes) and `docs:test` green, the scratch
check against remy-auth-app and a new app (risk 2) passing, and the reviewer agent's verdict. No
release. Then it merges to main and the next phase starts (working rules).

- **0. Unknowns:** the tests above. Done 2026-09-29, all pass (verdicts above).
- **A. Proof:** the layout inventory written into tasks.md, group 1 (providers and shell), and the
  `@joeblew999/remy-ui/*` mappings removed from the root and docs `tsconfig.json` (risk 10). The smallest change that proves the loop.
  Done 2026-09-29 (verdict below).
- **B. Docs system:** group 2, with provisioning owner-only (risk 8). Done 2026-09-29 (verdict below).
- **C. The rest:** groups 3 to 7. Done 2026-09-29 (verdict below).
- **D. Release, then `remy-auth-test` (stops for the owner):** everything below is prepared unattended;
  each outward step waits for the owner (working rules). One `ui:release` (the full gate) carries the package and
  tasks together; remy-auth-app moves with `project:upgrade-ui`. `remy-auth-test` is created on the
  release from the blank app (group 7), with the layout, the docs (Ask AI opt-in, not switched on) and
  its gates green; its hand-written files, set against the evidence table, are the plan's acceptance.
  Public on GitHub and deployed live (owner, 2026-09-29: "public on github is fine. live is fine. you can
  decide IF you can really test it or not"). Decided: live, because it can really be tested there: the
  shared remote tier (`project:test:live`, the smoke checks against `DEPLOY_ORIGIN`) and `docs:test:remote`
  run against its Workers, which is the path every new repo takes. Release number 0.14.0 (breaking,
  under 1.0; the owner can call it 1.0.0 instead).

## Phase A: done 2026-09-29

Decisions (the Executor's, per the working rules):

- **One app config, `defineRemyApp`** (`@joeblew999/remy-ui/app-config`): brand, repository, the site
  header's nav and extra links, the app side's home, nav and extra links. Each link is written with
  TanStack's `linkOptions({ to })` in the app, so it is checked against the app's own routes where it is
  written (TanStack's own guidance for shared components); a `NavItem` keeps the link apart from its
  `label`, `icon`, `core`, `exact`, because `linkOptions` rejects extra fields and `title` is the link's
  HTML attribute. The frame spreads the options into `Link` and names no route but `/`.
- `AppProviders` takes `app` and `preferred`; the frames read both from it. The ten page routes that
  threaded `preferred={usePreferred()}` lost it, and the package's `usePreferred` went. The old
  `SourceLink`, `SiteNavLinks`, `AppNavLinks` contexts went into the config.
- `AppShell` lives in `app-shell` (the frame alone); `app-pages` keeps remy-auth's showcase pages. The
  showcase's lists are `showcase/app-nav` (`showcaseSiteNav`, `showcaseAppNav`), which remy-auth and
  remy-auth-app opt into. `Intro`'s back link is `backTo: 'site' | 'app'`.
- The clock's nav link now passes `clockDefaults` as search: its route requires `zones`, which the old
  loosely typed list hid; `stripSearchParams` keeps the URL `/app/clock`.
- Both `@joeblew999/remy-ui/*` tsconfig mappings are gone; remy-auth resolves the package through its
  exports like any repo.
- The layout is in [tasks.md, "The layout"](../docs/content/dev/tasks.md).
- Not in phase A: `paths.js`'s remy-auth page lists stay as runtime defaults (every app passes its own
  today); group 5 takes them. The docs header and sidebar links (`src/docs/header-link.tsx`) stay
  remy-auth's until group 2 makes them the platform's.

Checks: tier 0 green; tier 3 81/81 (after one fix: the build-boundary marker for `request.cf`,
`/\.cf\b/`, matched a minified spread `{...cf}` once the shell's names shifted; it now needs a member
access, `/[\w$)\]]\.cf\b/`); `docs:test` 7/7. Scratch check (risk 2) from a local `npm pack`: a new app
with its own routes (`/`, `/videos`, `/app`, `/app/videos`) and config typechecks and builds, and its
pages show only its own brand, links and nav (phase 0's A6 errors are gone); a copy of remy-auth-app
moved to the new shape (config with the showcase lists, `preferred` from its own hook into
AppProviders, ten page props gone) passes tier 0 including its prerender. Hands-on (local preview, not
`cf:preview`: only merges go out): desktop site header as before; phone, Arabic, `/ar/app/clock`:
right-to-left frame, bottom bar from the config with Clock active, the language hint shown with no page
passing `preferred`, More opens the sidebar on the reading side with the guide link; no console errors.
Accepted by the reviewer agent (ACCEPT, six non-blocking notes, five fixed before the merge: stale
docs naming `app-pages.tsx` for `AppShell`; nav keys from `link.to`, not an English label; the site
header marks its active link with `navLink`'s match like the sidebar; the root reads
`data?.preferred`; the breaking changes recorded in `CHANGELOG.md` `[Unreleased]` for phase D's
release. The sixth: the scratch app is not a git repository, so its `i18n:check` warns; the claim was
only typecheck and build.) Tier 0 and tier 3 81/81 again after the fixes.
Cost: every page's entry chunk grows 1.6 KB gzip (the root now imports the app config with the app
nav's icons and the clock's defaults); Lighthouse and Core Web Vitals in phase D's release gate judge it,
and the app nav could move to the app frame alone if it matters.

## Phase B: done 2026-09-29

Decisions (the Executor's):

- **The docs Worker lives in `@joeblew999/remy-ui`** (`src/docs`), not a second package: one version,
  one `project:upgrade-ui`, and every repo has docs anyway. Its runtime dependencies (Fumadocs, the AI
  SDK, MCP, mermaid and the rest) are the package's; an app's `docs/package.json` names only the package.
- **An app's `docs/`** is `content/`, `docs.config.ts` (the product's names; `defineDocsConfig`) and three
  one-line files: `vite.config.ts` (`remyDocs(docsConfig, { contract })`), `tsconfig.json` (extends the
  package's; `${configDir}` maps `@remy-docs-app/*`), `package.json`. remy-auth's went from 61 files
  outside `content/` and `public/` to those 4 (46 lines); a new repo's are 4 files, 34 lines.
- **Generated into `docs/.remy-docs/`** (gitignored) by the preset: `collections.ts` (fumadocs-mdx's macro
  never compiles `node_modules`), `wrangler.json` (the Worker's configuration from `docs.config.ts`; every
  wrangler command reads it, the built one `dist/server/wrangler.json` for dev and deploy), `app.json`
  (whether the app has an API, for the checks). `_headers` is emitted into the build.
- **The Worker reaches the app through one alias**, `@remy-docs-app/`: `docs.config.ts`, the content's JSON
  and the contract (a Vite alias to the package the app names; declared in `app-modules.d.ts`). The docs
  table is a pure core (`table-core.js`) fed by Vite (`table.js`) or by the file system for the Node
  scripts (`scripts/app-table.mjs`).
- **Ask AI is opt-in**: `docs.config.ts`'s `ask` names the AI Search instance, bucket, gateway and
  rate-limit namespace; without it there is no Ask AI page, button, bindings or publishing. The Worker
  reads the two bindings by name (`Reflect.get`), since an app without Ask AI declares neither.
  `docs:provision` prints the creating commands and creates nothing.
- **No API, no reference**: remyDocs without `contract` sets `__REMY_DOCS_API__` false: no `/reference`,
  tab, llms entry or MCP server. The "For AI tools" help pages are `docs.config.ts`'s `aiHelp`, else each
  part's `llms.txt`.
- **Checks from the app's content**: `docs.spec.js` and `lighthouse.spec.js` take their pages from
  `meta.json` and the preset's `app.json`; the Ask AI checks run only with `ask`.
- **Build-time modules ship as JavaScript** (`docs/vite.js`, `docs/config.js`, the tests, the Playwright
  config) with `.d.ts` beside them, as `parts/vite.js` and `prerender.js` already did: Node strips no
  types under `node_modules`, which only a new repo meets (remy-auth's package is a workspace).
- **The frame's docs links** (Docs, Developers, the sidebar's Guide) come from `defineRemyApp`'s `docs`
  origin; remy-auth's hand-written ones went (its old-address redirects and home cards stay its own).
- **The `remy` skill** is generated from the developer docs into the package (`packages/ui/skill.mjs`, run
  by `ui:generate`, so every pack and release has its version's rules); `skills:install` adds it from
  `node_modules` (a local source the tooling check allows); `agents:rules` keeps the `AGENTS.md` block,
  run by `project:setup` and `project:upgrade-ui`. remy-auth's own `AGENTS.md` indexes the docs.
- `docs:cli` is remy-auth's own task now (it changes the package); `docs:init` copies
  `packages/ui/src/docs/template` at a tag.

Accepted by the reviewer agent (ACCEPT, six non-blocking notes). Fixed before the merge: `docs:test:remote`
writes `.remy-docs/` first and checks the reference MCP server only with an API; the emergency stop
(`docs:answers:off`/`on`), `docs:observe` and `docs:ai-gateway` work on a fresh clone (they load
`vite.config.ts` with Node, ~1 s, which writes `.remy-docs/`; its config import now carries `.ts`);
`skills:install` no longer hides a failed `remy` install; stale "docs/tests" wording; the new repo's docs
re-run on the last commit. Left: `skills-lock.json`'s `remy` hash changes whenever the developer docs
do, which is the lock doing its job.
Checks: tier 0 green; tier 3 81/81; remy-auth's `docs:check` green, `docs:test` 9/9 (7 before: the pages
now come from the content). Scratch check (a local `npm pack`, no workspace): the new app's docs from the
template, without Ask AI or an API, pass `docs:check` and `docs:test` (3/3); `skills:install` installs
`remy` for both agents and `agents:rules` writes, then keeps, the block. The check found five things only a
new repo meets, all fixed: TypeScript under `node_modules` (above), `mdast-util-to-markdown` 2.1.3 (D3;
pinned at 2.1.2 in the package), the optional bindings' types, a 404 for the missing favicon, and the
empty reference. Hands-on (local, built Workers): remy-auth's `/docs/formats` on a desktop as the live
site (tabs, contents, pictures, Copy Markdown, Ask AI), no console errors; the new repo's `/docs` on a
phone with its own name, no Ask AI, no errors; its `/reference`, `/api/mcp/reference` and `/docs/ask`
404, its `llms.txt`, search, sitemap and MCP answer.

## Phase C: done 2026-09-29

Decisions (the Executor's):

- **One dependency set is the package's own dependencies** (group 3): the framework, the toolchain and the
  tools the shared tasks run (Playwright, Lighthouse, the DevTools MCP server, Codex, npm-check-updates)
  are `@joeblew999/remy-ui`'s exact dependencies, with no optional peers, so npm installs one version of
  each for any app; `remy.singleCopy` names those that break when installed twice, and
  `project:single-copies` (tier 0) fails on a second copy. Chosen over a manifest `project:upgrade-ui`
  applies: nothing to apply, and phase 0 test 4 showed npm honours it. An app's `package.json` names the
  package and its own packages.
- **Checks split** (group 4): the shared sets take `sitePaths`/`appPaths`; the home page's words only with
  `home`, the showcase's checks only with `showcase`.
- **Shared runtime defaults** (group 5): `app/vite`'s `remyApp()` is a whole `vite.config.ts`; `root`'s
  `remyRoot(app, { devtools })` and `router`'s `remyRouter(routeTree)` make `__root.tsx` and `router.tsx`
  one call each; the CSP report route and the enforced policy are the package's defaults; Zod's `jitless`
  is set once; no remy-auth page list is a default anywhere. TanStack Devtools stay in the app's root
  file: its Vite plugin strips them only outside `node_modules` (read in its source; replaced by `null`
  when passed as an option, so the build-boundary check still passes). `Env` before the first
  `wrangler types` needed no shim: the blank app has `wrangler.jsonc`, and `project:typecheck` runs
  `wrangler types` first.
- **Package owners** (group 6): the `packages:*` tasks (check, upgrade, pack, release, tag, publish, notes)
  are shared, driven by the non-private workspaces and `RELEASE_PACKAGE`/`RELEASE_TITLE`; remy-auth keeps
  `ui:release` as a one-line alias and fills the new hook `project:release-checks` (`template:check`,
  `ui:verify`). `scripts/release*.sh` went; `verify-tooling` is shared (every workspace against the
  lockfile, `preview_urls: false`, skill pins) with `project:doctor`. CI: `google.yml` is a reusable
  workflow; an app calls it at its tag, `project:upgrade-ui` moves that tag, and the release job is one
  task, `packages:publish --release`, the same as the local release. A second catalog follows the
  platform's language with `followLocale(runtime)`; an app's own catalog (`project.inlang`) is compiled
  by the preset and by the shared `project:generate`.
- **What stays small** (group 7): `project:setup` checks for a git repository, `package.json`,
  `package-lock.json` and `wrangler.jsonc` first, each with where to go; `project:refresh-tasks`; the port,
  coverage and `_` sibling-route notes in tasks.md; a missing `src/parts.json` lists no parts. The stray
  `docs/$S/ask-phone.png` was already gone.
- **The blank app is `template/` in remy-auth**, taken at the release tag with `giget` (as `docs:init`
  already took the docs template, which moved into it as `template/docs`). Not a GitHub template
  repository: creating one is an outward step, and a folder here is versioned with the tasks and package it
  pins. Its home page's words are its own catalog in every language (translated by `i18n:messages:translate`),
  because the shared font check rightly fails a page whose text is not in the page's language. It commits
  its generated `src/routeTree.gen.ts`, as every app does, since `project:verify` typechecks before it builds.
  `template:check` (in remy-auth's release checks) fails a release whose version the template does not pin.
  It is 38 hand-written files, about 316 lines with the docs (64), against about 3,300 non-video lines in
  remy-video (the evidence table).

Checks: remy-auth tier 0 green; tier 3 81/81; `docs:test` 9/9. Scratch check from `packages:pack` (no
workspace): the template copied untouched, `npm install` once, then the full `project:setup` (npm ci,
skills, the `remy` skill, the rules block, MCP, `project:verify`): 134/134 in every language, with the
doctor, tooling and types (after adding the route tree, which the first run was missing). The template
plus one site page, one app page and one API procedure in a contract workspace (the shape of
`remy-auth-test`): tier 0, tier 3 38/38 with the API checks, `docs:test` 4/4 with its reference, no
devtools in the shipped scripts. A copy of remy-auth-app on the new shape: tier 0, tier 3 43/43; it needed
four edits, which phase D applies (below). Found by the scratch checks and fixed: a missing
`src/parts.json` failed the build; the blank page in English failed the Arabic font check (the template's
strings are now translated); the missing route tree; the moved `verify-tooling` resolving its imports from
mise's cache (it resolves them from the app now). Hands-on (local production builds): remy-auth `/formats`
desktop, `/ar` and `/ar/app/clock` on a phone (right to left, the bottom bar with Clock active), the same as
before; the blank app's `/en` desktop, `/ar` phone dark and `/ja` phone: its own name, links and words.
Review: the reviewer agent ACCEPTED on its second pass. It first REJECTED on one blocking issue: `packages:publish`'s token lost to an app's
own `.npmrc` (the blank app's reads `${GITHUB_TOKEN}`, unset during a release), so a template-born repo would
tag and never publish. Fixed: the task exports `GITHUB_TOKEN` and `NODE_AUTH_TOKEN`, the CI step sets it;
reproduced behind the template's `.npmrc` (401 before, the version after). Its non-blocking notes, fixed:
`ncu.sh`'s empty array under bash 3.2's `set -u`; `app-catalog.js`'s run guard under a symlinked package
(realpath); `.gitignore` `/*.tgz`; `defineRemyApp`'s `sitePaths` required (the sitemap no longer silently
lists only the home page); the template now runs the devtools build-boundary check
(`buildBoundaryChecks`' device-time test is the option `deviceTimePath`, which remy-auth passes); and
`template:test` (in remy-auth's release checks) installs, builds and tests the blank app on the commit's
packages (tier 3 35/35, `docs:test` 3/3), not only its pins; docs and CHANGELOG gaps. Left as notes:
the blank app's catalog is outside remy-auth's `i18n:check` (`template:test` runs its checks, not the
strict translation check; with the parked locale-list item); `project:doctor` no longer prints
remy-auth's `auth` version (`auth:info` does); `gh` through aqua in CI, first run at the tag. `template:test` installs with `GITHUB_TOKEN` from
`gh auth token`. After the
fixes: tier 0 green, tier 3 81/81.
Not checked: the reusable workflow and `packages:tag`/`packages:publish` against GitHub (only a tag runs
them; phase D's release is their first run), `packages:upgrade` (dependency freeze).

## Phase D: prepared 2026-09-29, waiting for the owner

Everything here is ready; each step goes out only when the owner says so (working rules). In order:

1. **Release 0.14.0.** The version commit is ready on the local branch `release-0.14.0` (not pushed):
   `packages/ui` 0.14.0, `template/` pinned to 0.14.0 (package, tasks ref, workflow tag, so
   `template:check` passes), `CHANGELOG.md`'s `[Unreleased]` as `[0.14.0]`. The contract is unchanged
   (0.2.1, already published). Owner: merge it to main, then `mise run ui:release` (~5 min; the full gate,
   then tag, push, publish and the GitHub release; the tag's CI job repeats Google's audits and is the first
   run of the reusable workflow's release job).
2. **Deploy remy-auth** (the app and its docs Worker, both on the new shape): `GATE=quick mise run cf:deploy`
   and `mise run docs:deploy`, after `mise run cf:preview` and a hands-on pass.
3. **Create `remy-auth-test`** from the blank app at v0.14.0 (tasks.md, "A new consumer"): public on
   GitHub, the package's "Manage Actions access" granted to it, one page and one procedure added (as the
   scratch check did), then `cf:deploy`, `docs:deploy`, `project:test:live` and `docs:test:remote` against
   its Workers. Its hand-written files, set against the evidence table, are the plan's acceptance.
4. **remy-auth-app** waits for the owner's decision on its future (owner, 2026-09-29: "we will decide about
   remy-auth-app later"). Moving it is `project:upgrade-ui -- 0.14.0` plus what the scratch copy needed:
   phase A's config (`defineRemyApp` with the showcase lists and `sitePaths`, `app` and `preferred` into `AppProviders`),
   `package.json` down to the package and the contract, `prerenderPages({ notFoundPath, paths: allPaths })`,
   `sitemapXml({ origin, paths: sitePaths })`, and `prerenderedAppChecks({ service, sitePaths, appPaths,
   home, showcase: {} })`; its `AGENTS.md` block from `agents:rules` replaces the dead links.

## Parked while running (working rules: recorded, skipped, reported at the end)

- **Docs `/dev` hydration mismatch (live, pre-existing).** https://remy-auth-docs.gedw99.workers.dev/dev
  at desktop width logs React #418 in production (seen 2026-09-29 on the live site, before any thin-apps
  change reached it). Cause, from the server HTML against the hydrated page: Fumadocs' notebook layout's
  contents popover trigger (`fumadocs-ui/dist/layouts/notebook/page/slots/toc.js`,
  `PageTOCPopoverTrigger`) shows the active heading (`items[selectedIdx].original.title`, "Where to look")
  on the client during hydration and none on the server; it shows when a page's first heading is in view
  at load. Found by phase B's docs checks, which now take their pages from the content; the hydration
  check covers each site's first page and its translation, as before, not the index pages, until this is
  fixed (upstream issue or a fix in the Worker's view).

- **The app's catalog repeats the platform's language list.** Closed 2026-09-29 by platform-structure fix 5
  (`i18n:messages:check` compares them). `template/project.inlang/settings.json`
  copies remy-ui's 13 locales; a language added to the platform needs adding there too, and nothing checks
  it yet. A small shared check (the app's locales equal the package's) belongs in `i18n:messages:check`;
  not done in phase C to keep the phase to its groups.

## Open questions for the owner

- remy-auth-app after phase D: keep it as the showcase of the prerendered mode (the default; it stops
  being the template), or retire it once the blank app exists?
- Which other repos follow (remy-data, remy-sport, remy-nash do not include the tasks yet;
  remy-auth-app-layout is on 0.11.0)?
