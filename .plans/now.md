# Now: the open plans, in the order they close

Owner, 2026-09-26: "We desperately need to close outs plans ... work out the right order to close them
out because it's now gotten into a huge mess." One list, in order. Close an item only when it is on
main and live where that applies; then move its plan to [done/](done/) with a closing line. Big features
wait in [parked/](parked/). What broke along the way is in the [stability log](stability-log.md).

## What is left, in order (2026-10-09)

Owner: "make plans for all the things left." Everything open, each with its plan and its command.
Below this section is the history of how it got here.

1. ~~**No mise: package.json is the entry, the tooling one TypeScript command line**~~ closed 2026-10-11
   ([plan](done/tooling-in-typescript.md); owner, 2026-10-11: "strip away mise so that its all typescript",
   "use the package.json as the entry point like all typescript projects do"). Slice 1 landed the same
   day: `npm run dev:<step>` is the flow, `remy` (the package's bin, `packages/ui/src/cli`) is its
   code, `remy.config.ts` the origins and ports. Next: the check (`project:check`) as functions, then
   Cloudflare, translations, the other namespaces, GitHub and the consumers, then `mise.toml` and
   `tasks/` deleted. The flow's own open gaps below ride on it: the detached translation comes with
   the translations slice; the docs build with the check slice.
   Notes from the flow's open gaps (seen and measured 2026-10-10), kept until their slices close them:
   - **The terminal.** A landing is on staging after 44 s; the command then waits for the
     translation: 2 min 15 s to update one page (the agent wrote 13,248 tokens to change a few lines,
     because it returns the whole page), 5 min 14 s for the same page from scratch. The fix:
     `dev:land` returns when staging is up and the translation runs detached, its result in
     `dev:status`; after that, the agent changes the lines the English changed instead of returning
     the page ([translation-pipeline](translation-pipeline.md)'s analysis had it edit in place; the
     build gives it no tools).
   - **The docs build.** `dev:land` translates after its check and pushes, and GitHub's three jobs do
     not build the docs. A translated page that passes `tasks/i18n/docs/page.ts` (frontmatter and
     text) but does not compile would reach main: the next `dev:change` that builds the docs fails,
     and `dev:promote` would deploy the app and then fail at the docs, since it runs `cf:deploy`
     before `docs:deploy` (read in `tasks/dev/promote.ts`, not run). The fix: the docs writer builds
     the docs before its commit counts, as the messages writer runs its checks (in a worktree of its
     own, never the main checkout), or GitHub gains a docs build job.
   - **The live smoke right after a staging deploy.** On a docs-only landing (9102bf7, 2026-10-10)
     the smoke's "hydrate without errors" timed out waiting 5 s for React to hydrate the just-deployed
     Worker's `/en` (3 of 4 passed; staging was up at that commit; no console error in the page
     snapshot); twenty minutes later the same smoke against the same staging passed 4 of 4, hydrating
     in 1.4 s. So it is the first load of a fresh version, not the page. It repeated 2026-10-11
     (be07ad0, the same check, the same recovery a minute later), so the cause is fixed, not the 5 s:
     the deploy's wait ended when the Worker version and one asset answered, while the first page
     needs every chunk it references, each cold at the edge after a deploy; now the wait ends only when
     the home page's every asset answers (`cloudflare.ts`). What the flow did with it was fixed
     2026-10-10: `dev:land` no longer stops there with the translation skipped.
   - **The by-hand tasks that end in the verification, never run since the gate.** `project:setup`,
     `packages:upgrade` and `project:upgrade-ui` called `project:verify` bare, and `ui:release` called
     `packages:release` bare, which the gate (10-09) refuses; fixed 2026-10-10 by each saying it is
     asking (`ui:release` is now an alias of `dev:release`), and proved at the gate only
     (`REMY_FLOW=setup npm run dev:allowed -- project:verify` passes, a bare one is refused). None of
     the three has been run end to end since: item 3's `project:upgrade-ui` on remy-auth-app is the
     first, and the place it would have failed. Their descriptions disagree on the time too
     (`project:setup` says ~1.5 min, the `project:verify` it ends with ~4.5 min in remy-auth): put the
     measured number in both at that run. Open with it: whether setup and an upgrade should end with
     every browser check in every language at all, when GitHub runs them after the landing.
   - **The guard and a search.** The agent hook refused a `grep` for the words of a bare browser-suite
     run (2026-10-10), then a `grep` of the consumer fixture's path (2026-10-11, twice, the second
     time refusing the fix to that rule itself). Fixed: a script's path counts only in a command
     position (at the start of a command or after a separator, with bash, sh or ./); naming it in a
     search or a cat does not (`flow.ts`, `spelled`). An agent also cannot reproduce a red job with the
     task GitHub ran (the hook refuses `REMY_FLOW=hand` from an agent): its way is the run's log and
     `project:test:only`, now said in how-we-work.
   - **The `remy` skill's hash moves with the docs.** `skills-lock.json` records a hash of the `remy`
     skill, which `ui:generate` makes from these developer docs, so every docs landing leaves the lock
     stale until someone's `project:setup` rewrites it (seen 2026-10-10: setup dirtied the tree after the
     day's doc changes). Either the lock stops hashing a generated skill, or `dev:land` refreshes it
     when docs changed; decide in item 4's work on the tooling.
   - **The new-app steps** in [tasks](../docs/content/dev/tasks.md) were corrected by reading, not by
     running (translate once by hand with `REMY_FLOW=hand`, the first deploy by hand, then the flow);
     creating `remy-auth-test` (item 3) is their first run.
   - Closed of it: `dev:land` deploys staging before it translates (05896d6, 2026-10-09). The word
     `null` committed as the Spanish "How we work" the same day (b9a4a22) is fixed: the writer writes
     only what is a page, a failed agent fails the run, a unit check reads every translated page
     ([stability log](stability-log.md)). The step and the translator say what each part and each
     agent call took.

2. ~~**Release 0.15.0**~~ done 2026-10-11 ([thin-apps, phase D](thin-apps.md#phase-d-prepared-2026-09-29-waiting-for-the-owner)):
   `npm run dev:release` (the owner handed it over: "its all yours"): tag `v0.15.0` on `0dbed8d`, the three
   packages published, GitHub's run on the tag green on every job, then `npm run dev:promote`: production
   and the docs Worker on `0dbed8d` (05:24). The promote's docs step ended red on the fixed questions,
   asked seconds after the index's sync had started: item 3a.
3. **Consumers onto the release**: remy-auth-app moved 2026-10-11 (`fc98a2d` on its main: the scripts,
   `remy.config.ts`, the workflow at `v0.15.0`, mise gone, the showcase from `@joeblew999/remy-showcase`,
   `defineRemyApp`, `remyApp()`, three check calls, dependencies down to the three packages). Its GitHub run
   is red at `npm ci`: GitHub Packages refuses `@joeblew999/remy-showcase` to its workflow (403), as it
   refused the contract two weeks ago; the package's "Manage Actions access" must grant the repository, a
   setting on the package's page (owner only, below). Then its `npm run dev:promote` (the first on the
   flow), and `remy-auth-test` from the template. What the move found is item 3a. `npm run upgrade` leaves
   an app's scripts as they are (remy-auth-app's say `remy status`, which answers by alias since the flow
   became `remy flow <step>`, 2026-10-11); refreshing them from the blank app is the upgrade's next piece.
   - a. ~~**0.15.1**~~ released 2026-10-11 (tag `v0.15.1` on `af07ece`; remy-ui 0.15.1, remy-showcase 0.1.1,
     the contract 0.4.1; the release's full run passed on the fourth try: the notes checks clicked before
     hydration under a full run's load, fixed): `remy docs publish` in TypeScript (the three `.mjs` gone)
     waiting for the sync before the questions, and `remy docs questions`; `remy.config.ts` owns the origins
     (a shell still carrying remy-auth's mise-era `[env]` made remy-auth-app's landing deploy a staging
     Worker, deleted, and wait on remy-auth's); GitHub's verdict from main's push runs only (Dependabot's
     run read as green on a red commit; a tag's run on the same commit held the promote); the showcase
     declares its dependencies (zod 3 at the top of remy-auth-app's grown lock broke `zod/mini`; a fresh
     lock and the declaration fix it); the route tree part reruns on `src/start.ts`. Promoted 2026-10-11:
     production and the docs Worker on `db9e180` (the docs publish waited for the index's sync; five of the
     six fixed questions rank first, where two had failed before the wait). remy-auth-app is on 0.15.1
     (`c68874d`, through `npm run upgrade -- 0.15.1`, proved end to end: install, the workflow's tag, the
     skills, the rules, the installation's checks); its production waits for the owner's grant (item 3).
4. **Auth, next slices** ([auth-service](auth-service.md#next-slices)): the app-trust comparison
   (OAuth tokens verified locally against a service binding, each proved small); the relation
   engine's write half (`grant`, `revoke`); a rule for server functions and routes outside the oRPC
   router; the consumer fixture using relations; then remy-sport's own move onto the engine and the
   aspects deferred from it (a code a human switches on for deployed checks, the sessions and devices
   page, a person's lifecycle).

5. **Cedar over the relation engine** ([plan](cedar.md), from [the research](cedar-research.md),
   2026-10-10): policies that decide from the relations the engine derives, so an app can say what
   `grants` cannot (a deny with a reason, a share until a date, a sign-in recent enough) in a file any
   language runs and a test file proves. Slice 0 is a spike that can stop it; then generated policies
   with nothing changing, hand-written ones in the notes demo, facts about the sign-in. After the
   app-trust slice (5), which it rides on for other Workers.

6. **Platform structure** ([plan](platform-structure.md)): waits for the owner's three decisions
   named there.

7. **Docs and translations, leftovers**: [docs-for-consumers](docs-for-consumers.md), the shared
   docs part (the docs app's code into the package, so a consumer adds `docs/content` only: the last
   of its "Next, in order", restated under round 4), and [translation-pipeline](translation-pipeline.md)
   (built 2026-09-26; left of it are step 5, proving it in remy-auth-app, which waits for the
   release, and step 6, once there is a domain).

8. **Owner only** (below): the alert rule in the dashboard, a native-speaker review of the newer
   languages, the production domain and Search Console, more docs languages.

Done today, 2026-10-09, all live: auth slices 2 and 3, staging, the build stamp and versions, the
product name, the flow with its guard and hooks, GitHub's heavy checks after every push, the task
layer in TypeScript (part), feedback from everything asynchronous ([dev-feedback](dev-feedback.md)).

## In order

1. ~~**Fonts**~~ closed 2026-09-26 ([plan](done/fonts.md)). Left: font rows on the formats page (script, font drawing it, bytes).
2. ~~**Content-Security-Policy enforced**~~ closed 2026-09-26: enforcing live, the 404 and error pages carry it too. Left: glance at `/csp-report` in the logs after a day; raise HSTS max-age.
3. ~~**Parts**~~ closed 2026-09-26 ([plan](done/parts.md)): "Writing a part" is in the package README.
4. ~~**Publisher and consumers**~~ closed 2026-09-26 ([plan](done/publisher-consumer.md)): recipe, drift, package moves, consumer check set shipped; scripts reviewed, all kept.
5. ~~**Caching**~~ closed 2026-09-26 ([plan](done/caching.md)): don't cache HTML yet; assets immutable.
6. ~~**Observability**~~ closed 2026-09-26 ([plan](done/observability.md)): built; the answer-failure alert rule is a dashboard step (owner only, below).

## Next, in this order

Checked against the code 2026-09-26 (owner: "for the love of god check the sub parts are good"): three
fixes folded in below.

Owner, 2026-09-26: "there is so much to be aligned and done in the right order. I want to not do any more
manual translation until the docs and Paraglide stuff is solved, as it will slow us down." Structure first,
then tools, then translating.

0. ~~**Translation frozen**~~ lifted 2026-09-26: the tooling landed (step 3) and the pass ran (step 4).
1. ~~**Finish what is in flight**~~ done 2026-09-26: the Look fixes and issue #5 (the formats page one
   shape in every language; the issue can be closed).
   The layout contract (branch `project-layout`) is **not merged**, decided 2026-09-26: its core was a
   271-line checker of our own (`tasks/layout/layout.mjs`) over a contract in `tasks/README.md`, which the
   docs move removed; the owner's rule is no custom scripts, and a wrong layout already fails the app's
   own gates (typecheck, build, tests). Its useful fixes are on main: the header's GitHub link is the
   app's own (`SourceLink`), and `api:spec` explains a missing API. `APP_PAGES` was dropped: the app has no
   pages beyond the package's since the docs moved. The branch went 2026-10-09, with `fumadocs-trial` and
   the old `release-0.14.0`.
2. **Structure, in parallel:**
   - a. ~~**Fumadocs fully**~~ merged and live 2026-09-26 ([plan](docs-for-consumers.md)): the docs Worker
     (`docs/`, https://remy-auth-docs.gedw99.workers.dev): product guide `/docs`, developer docs `/dev`, API
     reference `/reference`, each with search, `llms.txt`, `.md`, an MCP server and Ask AI; Fumadocs' UI text
     per language. Left, in step 6: the shared docs part for consumers (the docs app's code in the package).
   - b. ~~**Paraglide plurals**~~ done 2026-09-26: `=*` in the 13 catalogs; the plural check is in step 3.
3. ~~**Translation tooling**~~ built 2026-09-26 ([plan](translation-pipeline.md#built-two-pipelines-one-pattern-2026-09-26)):
   `i18n:check` and `i18n:translate`, each split into messages (Paraglide) and docs (Fumadocs); the pinned
   Claude agent, no tools, on main under a lock, committing.
4. ~~**Unfreeze**~~ done 2026-09-26: 12 languages' missing messages, the Spanish docs (9 new, 6 updated),
   Fumadocs' `ui/es.json`, provenance lines gone; `ui:release` strict again.
5. **What conforming docs unlock** (moved into [thin-apps](thin-apps.md), group 2; research in [docs-for-consumers](docs-for-consumers.md)): `.md` pages, `llms.txt`, the copy
   menu; then docs for apps: a rules section in how-we-work, the `remy` skill (rules, evals) in the
   package, the `AGENTS.md` block pointing into `node_modules`.
6. ~~**Release and adopt**~~ done 2026-09-26: `@joeblew999/remy-ui` 0.12.0 released; remy-auth-app on it
   (https://remy-auth-app.gedw99.workers.dev), with the new pages and the phone's bottom bar. What it found
   is the list below ("Found moving remy-auth-app to 0.12.0").

Also queued (not in the order above): `git:tidy` (shared task for merged branches and worktrees).

**Branches and worktrees to remove (owner, 2026-09-26: agreed; the removal needs the owner's permission
setting):** `fumadocs-trial` (squash-merged), `worktree-wf_0e57b9eb-956-1`, `-956-2` and
`worktree-agent-ac2f2d97915e58832` (nothing unmerged), with their worktrees under `.claude/worktrees/`.
Also `project-layout` (step 1: not merged, its fixes ported). Keep the uncommitted Look work in `.claude/worktrees/agent-aca0ff9fa382158ea`
(the Look list below) until they are folded in.

## ~~Redo remy-auth-app the right way~~ done 2026-09-26

0.13.0 released through `ui:release`; remy-auth-app moved with `mise run project:upgrade-ui 0.13.0`, its root on
`AppProviders`, its Clock on `clockRouteOptions`; gates green (175), live at https://remy-auth-app.gedw99.workers.dev.

## Agreed: thin apps (owner, 2026-09-29)

[thin-apps](thin-apps.md): every Remy repo gets the platform with as little boilerplate as possible.
Built and proved in remy-auth first, no release until the end; then `remy-auth-test` proves it as a new repo. remy-video is not migrated; its replacement comes later.
Unattended through phase C (reviewer agent accepts each phase, merges to main only); phase D stops for the
owner before the release. Phases 0, A, B and C done 2026-09-29; phase D is prepared (the plan's "Phase D")
and waits for the owner (below).

## Then: clean up the developer docs (owner, 2026-09-26: "a bit weird for a public and agent audience")

Read every English page in `docs/content/dev/` as a newcomer and as an agent would: what it is, how to
start, where the rules are; cut history, internal asides and owner quotes that do not help either reader.

## Found moving remy-auth-app to 0.12.0 (2026-09-26)

Fixed in the package and shared tasks the same day (release 0.13.0, then remy-auth-app moves to it):
`AppProviders` (direction, theme, source link) and `themeChecks`; `project:check` builds before it
type-checks; `clockRouteOptions` for the Clock route; the consumer checklist in the UI package docs
(`AppProviders`, a route per path, `tests/smoke.spec.ts`, `.plans/now.md`, installs and upgrades
through `project:setup` and `project:upgrade-ui`, which remy-auth-app's move to 0.12.0 should have used
instead of being done by hand).

## Look (from `browser:shots`, 2026-09-26)

Done 2026-09-26 (from the saved agent work, on main): the home page has its content (where to go, the
product guide and developer docs, what every app shares); the zone label is a small line in the footer;
hyphenation is for body text only; each language name in "Available languages" is isolated (`bdi`); the
formats page's intro and "This language" share the first screen on desktop; issue #5 done.

## Watching

- oRPC 2.0: on the beta since 2026-10-09 (owner: "oRPC 2.0 beta"), pinned at 2.0.0-beta.42 in the
  [auth slice](auth-service.md#the-move-to-orpc-20-beta), on main and live. Follow the betas to 2.0.0 (each can
  break; `packages:upgrade` and the gates say), and move remy-auth-app with the next release
  ([what the move touched](done/openapi-contracts.md#orpc-20-watch-2026-09-26), issue #1).

## Checking took 95% of the time (owner, 2026-10-09, issue #10)

Fixed the same day, for every app through the shared tasks: `project:check` is the check, in seconds
(plans, types, the plain-function tier `tests/**/*.unit.spec.ts`, translation status; a build or the
docs only when their inputs changed). The heavy checks (every language, Google's audits, the consumer
fixture) run on GitHub after every push, in parallel; each still runs locally on purpose, and
`project:verify` at a release. Then formalised as the flow: `dev:change`, `dev:land`, `dev:promote`, `dev:release`, with a guard in the tooling itself (every heavy task refuses outside a step, on any machine, for any agent) and a Claude hook that answers a step earlier. The rule: [how we work](../docs/content/dev/how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest).

## Feedback from everything asynchronous (owner, 2026-10-09)

[dev-feedback](dev-feedback.md): one `dev:status` asked from the facts' owners, run at every agent
session's start, a landing told when main is red, a promotion written on its commit, the red-run
comment naming the job. Built in that order, each landed through the flow.

## The tooling in TypeScript (owner, 2026-10-09, issue #9)

[tooling-in-typescript](done/tooling-in-typescript.md): the task layer is TypeScript, checked by
`project:check` wherever the tasks are (a consumer's include cache too). The flow, the deploy's two
scripts and the tooling invariants are converted; the rest follow in the order a wrong one costs most.

## What is deployed, and whose name it carries (owner, 2026-10-09)

[product-identity](done/product-identity.md): the build stamp every Worker answers with at `/healthz`, the
`BuildStamp` and `Versions` components, `cf:versions`, and the product's name as one value every message
takes. On main and live since 2026-10-09; GitHub's full run is green on it (run 37904724918), and production, staging and the docs Worker all answer `409356c`. Closes with the plan's move to done.

## Auth service (owner, 2026-10-09)

[auth-service](auth-service.md): opened for its first real slice. Slice 1 (Better Auth in the Worker on
D1, sign-in by emailed code, the account page, the shared guard and its checks on oRPC 1 and 2, and the
move to the oRPC 2.0 beta) is on main and live since 2026-10-09 (https://remy-auth.gedw99.workers.dev),
with its database and secret provisioned. The owner delegated its design decisions the same day; they
are recorded in the plan. Signing in on the deployment waits for mail delivery. Slice 2, the relation
engine lifted from remy-sport and used by every server operation and by the GUI (owner: "the rebac did
not also get used. And also not in the gui"), with the notes demo, and slice 3, remy-sport's way of
signing in for every Remy app (mail through Cloudflare Email Service, one table of what each
environment permits, seeded people with roles and a one-press picker), are on main
and live since 2026-10-09, with a staging deployment (https://remy-auth-staging.gedw99.workers.dev)
that has the automatic sign-in beside the normal one, as the owner asked. Then: the app-trust comparison (OAuth tokens verified locally, or
a service binding), which lets other apps use all of it.

## Core Web Vitals: the mobile formats page is over the limit (found 2026-10-09)

Found 2026-10-09: the page is not slow, the measurement was. The live home page paints in under
0.25 s; Lighthouse's default simulation loads it at full speed and then estimates, and when the
scripts arrive before the first paint (a quick line to the host) it takes them for render-blocking and
says 1.1 s on some runs and 3.5 s on others for the same page. Its applied throttling (the page really
loads slowed down) said 0.83 s on every one of five runs. `performanceChecks` now measures a phone that
way (`packages/ui/src/checks.js`; desktop unchanged). Not yet run through `project:test:cwv`: GitHub
runs Google's level after this push, and `cf:preview` measures it on a throwaway Worker on purpose.

## Next: platform structure (owner, 2026-09-29)

[platform-structure](platform-structure.md): the five structural causes behind thin-apps' problems
(remy-auth cannot see what another repo sees, one package doing two jobs, types stopping at the seams, shell
task logic, facts in several places), and their fixes in order. Waits for the owner's three decisions.

## Owner only

- **remy-auth-app's CI and production** (2026-10-11): its workflow's `npm ci` gets 403 on
  `@joeblew999/remy-showcase` from GitHub Packages. On the package's page (Packages → remy-showcase →
  Package settings → "Manage Actions access"), add the `joeblew999/remy-auth-app` repository, as remy-ui
  and the contract have it. No API offers this. Then `npm run dev:promote` in remy-auth-app puts 0.15.1 live
  (the flow refuses a red commit until then).

- ~~Release 0.14.0~~ shipped as 0.15.0 and 0.15.1 (2026-10-11, items 2 and 3a above).

- One alert rule in the dashboard (no API for it): Workers & Pages → Observability → Alerts → Create,
  service `remy-auth`, `event = ask` and `outcome = failed`, count > 5 in 15 minutes.

- A native-speaker review of the ten newer languages' catalogs and the Spanish docs.
- The production origin (a custom domain) and Search Console. It also unlocks: AI Search crawling the
  docs site itself (its website source needs a domain on this Cloudflare account, not workers.dev),
  which deletes `docs:publish`, its script and the R2 bucket; and caching docs pages at the edge.
- Search Console for the docs Worker (works on workers.dev with a URL-prefix property and an HTML tag), with
  the site included in "Search generative AI features": Google's AI Mode, AI Overviews and the Gemini app
  see the docs only through the index, not MCP or llms.txt (docs/content/dev/ai-tools.md, "Gemini and Google").
- More docs languages: add the language to the site's `docs/content/<site>/i18n.json` and translations
  beside the pages (`<page>.<lang>.md`); `mise run i18n:docs:check` lists what each language still needs.

## Parked

[better-auth-ecosystem](parked/better-auth-ecosystem.md),
[gui-portal](parked/gui-portal.md): big, not now (owner: "Not big feature stuff").

[flue](parked/flue.md): a link to https://github.com/withastro/flue, to come back to.

[cf-cli](parked/cf-cli.md): adopt Cloudflare's `cf` CLI (https://github.com/cloudflare/cf), to come back to.
