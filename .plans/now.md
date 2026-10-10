# Now: the open plans, in the order they close

Owner, 2026-09-26: "We desperately need to close outs plans ... work out the right order to close them
out because it's now gotten into a huge mess." One list, in order. Close an item only when it is on
main and live where that applies; then move its plan to [done/](done/) with a closing line. Big features
wait in [parked/](parked/). What broke along the way is in the [stability log](stability-log.md).

## What is left, in order (2026-10-09)

Owner: "make plans for all the things left." Everything open, each with its plan and its command.
Below this section is the history of how it got here.

1. ~~**The flow's last gap**~~ closed 2026-10-10: `dev:land` deploys staging before it translates
   (05896d6), so a landing is usable in a minute and the Spanish writes itself afterwards (translation
   is the Claude subscription on the machine, never GitHub: the API is too expensive, owner
   2026-10-09). It was not the last: that translation is pushed with no check after it, and the same
   day's run committed the word `null` as the Spanish "How we work" (b9a4a22), which stopped the docs
   building on main while every check was green. Fixed 2026-10-10: the writer writes only what is a
   page, a failed agent fails the run, and a unit check reads every translated page
   ([stability log](stability-log.md)). What is still open of it is in item 8.
2. **Release 0.14.0** ([thin-apps, phase D](thin-apps.md#phase-d-prepared-2026-09-29-waiting-for-the-owner)):
   prepared on main; the owner runs `mise run dev:release` (every check, every language, Google, Core
   Web Vitals on a preview, the tag and publish, ~6 min). It is also the first run of the phone speed
   measurement with applied throttling (`packages/ui/src/checks.js`).
3. **Consumers onto 0.14.0**: remy-auth-app with `mise run project:upgrade-ui -- 0.14.0` (it gets the
   flow, the guard, the stamp, the product name); create `remy-auth-test` from the template. Each is
   one worktree through the flow.
4. **The tooling in TypeScript** ([plan](tooling-in-typescript.md)): the remaining `.mjs` modules and
   their bash wrappers, in the order a wrong one costs most (`cf/versions`, `cf/urls`, `api/spec`,
   then `plans/plans.mjs`, `cf/observe.mjs`, `browser/shots.mjs`, `cf/gateway.mjs`,
   `mcp/register.mjs`, `packages/workspaces.mjs`, `project/single-copies.mjs`, `docs/provision.mjs`).
   One landing each.
5. **Auth, next slices** ([auth-service](auth-service.md#next-slices)): the app-trust comparison
   (OAuth tokens verified locally against a service binding, each proved small); the relation
   engine's write half (`grant`, `revoke`); a rule for server functions and routes outside the oRPC
   router; the consumer fixture using relations; then remy-sport's own move onto the engine and the
   aspects deferred from it (a code a human switches on for deployed checks, the sessions and devices
   page, a person's lifecycle).
6. **Cedar over the relation engine** ([plan](cedar.md), from [the research](cedar-research.md),
   2026-10-10): policies that decide from the relations the engine derives, so an app can say what
   `grants` cannot (a deny with a reason, a share until a date, a sign-in recent enough) in a file any
   language runs and a test file proves. Slice 0 is a spike that can stop it; then generated policies
   with nothing changing, hand-written ones in the notes demo, facts about the sign-in. After the
   app-trust slice (5), which it rides on for other Workers.
7. **Platform structure** ([plan](platform-structure.md)): waits for the owner's three decisions
   named there.
8. **Docs and translations, leftovers**: [docs-for-consumers](docs-for-consumers.md) step 6 (the docs
   app's code in the package) and [translation-pipeline](translation-pipeline.md) (upstream tools
   that replace the i18n tasks). Seen 2026-10-10: nothing builds the docs with a translation's own
   commit in them. `dev:land` translates after its check and pushes, and GitHub's three jobs do not
   build the docs, so a translated page that passes `tasks/i18n/docs/page.ts` (frontmatter and text)
   but does not compile would reach main and stop the next `dev:change` and `dev:promote`. The fix:
   the docs writer builds the docs before its commit counts, as the messages writer runs its checks
   (in a worktree of its own, never the main checkout), or GitHub gains a docs build job.
9. **Owner only** (below): the alert rule in the dashboard, a native-speaker review of the newer
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
`project:verify` at a release. Then formalised as the flow: `dev:change`, `dev:land`, `dev:promote`, `dev:release`, with a guard in the tooling itself (every heavy task refuses outside a step, on any machine, for any agent) and a Claude hook that answers a step earlier. The rule: [how we work](../docs/content/dev/how-we-work.md#the-flow-three-commands-and-a-guard-that-refuses-the-rest).

## Feedback from everything asynchronous (owner, 2026-10-09)

[dev-feedback](dev-feedback.md): one `dev:status` asked from the facts' owners, run at every agent
session's start, a landing told when main is red, a promotion written on its commit, the red-run
comment naming the job. Built in that order, each landed through the flow.

## The tooling in TypeScript (owner, 2026-10-09, issue #9)

[tooling-in-typescript](tooling-in-typescript.md): the task layer is TypeScript, checked by
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

- Release 0.14.0 (thin apps phase D and everything since: auth, relations, staging, the flow): prepared on
  main 2026-10-09 (`ui:version 0.14.0`, the CHANGELOG section). One command: `mise run dev:release` (every
  check, every language, Google, Core Web Vitals on a preview, then the tag and publish, ~6 min). Then
  consumers move with `project:upgrade-ui -- 0.14.0`; create `remy-auth-test`; remy-auth-app later.

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
