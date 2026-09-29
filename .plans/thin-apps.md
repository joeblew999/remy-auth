# Thin apps: every Remy repo gets the platform with as little boilerplate as possible

Status: agreed 2026-09-29, phase A next. Owner: remy-auth. Built and proved in remy-auth first, with no
release until phase D; remy-video (`../remy-video`, tasks and remy-ui 0.13.0) is the evidence and adopts
at the end. Executor/Reviewer roles as in
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
   Other repos move afterwards, one `project:upgrade-ui` each.
4. **Measured by deletion.** Each phase ends with remy-auth's own copies deleted and its gates green;
   the scratch check (risk 2) shows what the same change removes from remy-video.

## Evidence: remy-video today

Two field reports, drafted in remy-video:
[remy-auth-feedback.md](../../remy-video/.plans/done/remy-auth-feedback.md) (16 items: tasks, packages,
app) and [remy-auth-docs-feedback.md](../../remy-video/.plans/done/remy-auth-docs-feedback.md) (7 items:
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

Roughly 3,700 lines, of which a few hundred are video. The target is the few hundred.

### Every item in the two reports, and where this plan answers it

App report (A, [remy-auth-feedback.md](../../remy-video/.plans/done/remy-auth-feedback.md)):

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

Docs report (D, [remy-auth-docs-feedback.md](../../remy-video/.plans/done/remy-auth-docs-feedback.md)):

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

Each group names what it removes from remy-video and the report items it answers (A = app report,
D = docs report).

### 1. App chrome takes the app's routes (A6, A7, A8, A14)

Removes: `packages/ui/src/shell.tsx` (204), `problem.tsx` (46), `app-pages.tsx` (36), most of
`pages.tsx`; the forked `AppProviders`/`SourceLink`.

- `Shell`, `SiteShell`, `AppShell`, the sidebar and bottom-nav blocks and the problem pages read the
  nav from the app (the `SiteNavLinks`/`AppNavLinks` context or a typed config), not from remy-auth's
  page list. Type errors inside `node_modules` for another app's routes must be impossible.
- Context and `AppProviders` live in modules with no route imports.
- The shell reads `preferred` itself, so no page can forget the language hint.
- The blocks are exported or folded into `AppShell`; no consumer rebuilds the frame from primitives.
- remy-auth's own pages become its config, the same way remy-video's are.

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

What stays in a repo's `docs/` (owner: "is this realistic though"): `content/` and about five small
files the build tools read from the app: `docs.config.ts`, `package.json`, a one-line `vite.config.ts`
(`export default remyDocs(config)`), a `tsconfig.json` extending the package's, and `wrangler.jsonc`
unless Cloudflare's Vite plugin takes the Worker config from code (its `config` option beside
`configPath`). The ~2,000 lines of our glue move without trouble.

The one unknown is **routes**: TanStack Start builds its route tree from the app's `src/routes/`. The
generator takes `routesDirectory` and `virtualRouteConfig` (`@tanstack/virtual-file-routes`: `rootRoute`,
`route`, `physical`), paths relative to the routes directory; whether they may point into the package
and still build, split and typecheck is what the phase A test settles (risk 6), with the `wrangler.jsonc`
question.

- The Worker's routes, components, handlers, Ask AI, MCP, `llms.txt` and tests ship in a package
  (or the UI package) and take `docs.config.ts` and the contract as input.
- Provisioning each repo's own AI Search instances, R2 bucket and Gateway comes from `docs.config.ts`
  through shared tasks, not by hand.
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

- The owner tasks and release go into the shared tasks, driven by the workspace's package list.
- A second package's strings: its own catalog through the shared i18n tasks, one documented stanza.

### 7. What stays small (A2, A13, A16, D6)

Preconditions in `project:setup` (a `package.json`, a git repository), the task refresh alias, a clear
message when the preview port is taken, the contract coverage rule and TanStack's `_` sibling-route
rule in the consumer docs: fold into whichever group touches the file; not steps of their own.

## Risks, and what closes each (2026-09-29)

Owner: "I see risks !!" then "work out what to do to close the risks". Each risk has a fix built into
the phases below; none is left to care alone.

| # | Risk | What closes it |
| --- | --- | --- |
| 1 | Size: ten steps is "big feature stuff", the kind of plan that turned now.md into a mess | Phases, each with a stop. Only phase A is agreed now; B, C and D each need the owner's go after the previous phase's review. A phase that runs over is stopped and re-planned, not stretched |
| 2 | The wrong abstraction: config designed around remy-auth breaks the next app | Three users at every phase end: remy-auth, remy-auth-app and remy-video. The package is packed locally (`ui:pack`, nothing published) and installed into scratch copies of remy-auth-app and remy-video, with the tasks included from the local `tasks/`; both are moved onto the new shape there and typechecked and built. Their repos are not changed; the copies check the design. A shape that needs remy-auth-only escape hatches is changed before the phase ends |
| 3 | Owning the wrapper: every Fumadocs or TanStack Start upgrade becomes ours, for every repo | The wrapper keeps Fumadocs' TanStack Start template's file layout and records the template version it follows; an upgrade is that template's diff applied once, in the package. Fumadocs and Start are pinned exactly in one place, and `packages:upgrade` in remy-auth is the only way they move |
| 4 | Breaking the live sites | Other repos pin release tags, so a bad release reaches them only when they upgrade. remy-auth does not pin: it uses the package through the workspace (`"@joeblew999/remy-ui": "*"`, a symlink to `packages/ui`), so every change reaches it at once, before any release. That makes remy-auth the canary, and its guard is the deploy rule: its Workers deploy only after `mise run cf:preview` and the hands-on pass, `GATE=quick` for shared-package changes, never mid-phase from a half-moved state. Rollback is the previous Worker version (`wrangler rollback`) and, for other repos, the previous tag |
| 5 | Churn: a release and an upgrade per step, each able to break consumers | No releases while the plan runs (owner, 2026-09-29: "you dont have to do releases? you can code the shared system and refactor remy-auth as you go"). remy-auth runs the package's and `tasks/`'s current source through the workspace, so the shared system and remy-auth change together in the same commits. Other repos stay on their pinned 0.13.0 and meet the new shape once, in phase D. Checking against them needs no release either (risk 2) |
| 6 | The docs routes test fails | It runs in phase A, before phase B is agreed, with a fixed decision rule: pass means no routes in a repo; fail means the fallback (one-line re-export files, generated by the platform, never edited) is written into the plan with its file count before phase B starts |
| 7 | Clash with the queued developer-docs cleanup | None in fact: the docs system moves code, and content stays in each repo's `docs/content/`. The cleanup can run before, during or after |
| 8 | Provisioning costs money and needs the owner | Provisioning tasks print what they would create and stop, unless run by the owner with an explicit flag. They are owner-only in now.md, like the alert rule |
| 9 | remy-video drifts while it waits | remy-video's now.md gets a hold: product code only (videos, player, contract), no new platform-like code, until phase D. The same note applies to any new repo started before then |
| 10 | remy-auth reaching past the exports without noticing: the workspace symlink and `docs/tsconfig.json`'s `../packages/ui/src/*` mapping let it import files no other repo can | The mapping goes in phase A. Rule 3 is then checked, not trusted: the scratch check in risk 2 installs the packed package, so an import that only works through the workspace fails there before release |

## Phases

While coding: tier 0 (`project:check`, which runs `docs:check`), nothing slower. Each phase ends with
remy-auth using the new pieces only through their exports, its own copies deleted, tier 3
(`project:test:quick`, the tier for shared-package changes) and `docs:test` green, and the scratch
check against remy-auth-app and remy-video (risk 2) passing. No release. Then it stops for the owner's
review.

- **A. Proof (agreed):** group 1 (providers and shell), the `docs/tsconfig.json` mapping removed
  (risk 10), and the docs routes test. The smallest change that proves the loop, plus the one unknown.
- **B. Docs system:** group 2, with provisioning owner-only (risk 8).
- **C. The rest:** groups 3 to 7.
- **D. Release and adoption:** one `ui:release` (the full gate) carries the package and tasks together;
  remy-auth-app and remy-video move with `project:upgrade-ui`, delete their copies, and remy-video's new
  counts close the evidence table. That is the plan's acceptance.

## Open questions for the owner

- Which other repos follow remy-video (remy-data, remy-sport, remy-nash do not include the tasks yet;
  remy-auth-app-layout is on 0.11.0)?
