# Now: the open plans, in the order they close

Owner, 2026-09-26: "We desperately need to close outs plans ... work out the right order to close them
out because it's now gotten into a huge mess." One list, in order. Close an item only when it is on
main and live where that applies; then move its plan to [done/](done/) with a closing line. Big features
wait in [parked/](parked/). What broke along the way is in the [stability log](stability-log.md).

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
   pages beyond the package's since the docs moved. The branch can go with the others.
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
5. **What conforming docs unlock** ([plan](docs-for-consumers.md)): `.md` pages, `llms.txt`, the copy
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

## Next: redo remy-auth-app the right way (owner, 2026-09-26: "you fucked and now it needs to be refactored")

Its move to 0.12.0 was done by hand. In order:

1. Release 0.13.0 from here (`mise run ui:release`): `AppProviders`, `themeChecks`, `clock-route`, `gh` pinned
   in the shared tasks, `project:check` building first.
2. In remy-auth-app, only through the shared tasks: `mise run project:upgrade-ui 0.13.0` (the exact version
   and the tasks include at the tag, then verify). No hand-edited pins, no npm by hand.
3. Replace the hand-made pieces with the package's: the root's `ThemeProvider` and `SourceLink` become
   `AppProviders`; the Clock route spreads `clockRouteOptions`; check its layout against the consumer
   checklist in the UI package docs (routes per path, `tests/smoke.spec.ts`, `.plans/now.md`).
4. Its gates (`project:check`, `project:test`), then `cf:deploy`; the report starts with the live URL.

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

- oRPC 2.0: stay on 1.15.4 until 2.0.0 is final, then move server and clients together
  ([watch](done/openapi-contracts.md#orpc-20-watch-2026-09-26), issue #1).

## Owner only


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

[auth-service](parked/auth-service.md), [better-auth-ecosystem](parked/better-auth-ecosystem.md),
[gui-portal](parked/gui-portal.md), [remy-cli](parked/remy-cli.md) (one CLI instead of scripts): big, not now (owner: "Not big feature stuff").
