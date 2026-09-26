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
1. **Finish what is in flight** (English only): the layout contract and `project:layout`; the Look fixes
   (below).
2. **Structure, in parallel:**
   - a. **Fumadocs fully** ([plan](docs-for-consumers.md)): on the local branch `fumadocs-trial`, **not merged**
     (owner: "don't merge to main yet"; squash-merge when it is, see the stability log). The docs are their
     own Worker (`docs/`, `remy-auth-docs`, live at https://remy-auth-docs.gedw99.workers.dev from the
     branch): users' docs `/docs`, developer docs `/dev`, API reference `/reference`, each language at its
     own URL; search, `llms.txt`, `.md`, MCP (`docs:test:remote` checks it), Ask AI (Fumadocs' panel over AI Search),
     sitemap. Left: the Fumadocs UI's own strings per language (`defineI18nUI`, translation step 4), the
     shared docs part for consumers (after the merge), the full test run, the merge.
   - b. ~~**Paraglide plurals**~~ done 2026-09-26: `=*` in the 13 catalogs; the plural check is in step 3.
3. ~~**Translation tooling**~~ built 2026-09-26 ([plan](translation-pipeline.md#built-two-pipelines-one-pattern-2026-09-26)):
   `i18n:check` and `i18n:translate`, each split into messages (Paraglide) and docs (Fumadocs); the pinned
   Claude agent, no tools, on main under a lock, committing.
4. ~~**Unfreeze**~~ done 2026-09-26: 12 languages' missing messages, the Spanish docs (9 new, 6 updated),
   Fumadocs' `ui/es.json`, provenance lines gone; `ui:release` strict again.
5. **What conforming docs unlock** ([plan](docs-for-consumers.md)): `.md` pages, `llms.txt`, the copy
   menu; then docs for apps: a rules section in how-we-work, the `remy` skill (rules, evals) in the
   package, the `AGENTS.md` block pointing into `node_modules`.
6. **Release and adopt:** the shared UI released, remy-auth-app moved onto it, proving the translation
   tasks and docs in an app.
   It adds the app's new pages, `/app/clock`, `/app/account` and `/app/settings`, with the phone's bottom
   bar ([mobile navigation](mobile-navigation.md), built 2026-09-26).

**Docs Ask AI is off** (owner, 2026-09-26) until 2a lands: `docs:answers:off` in production, `DOCS_ASK = "off"`
in mise.toml (no docs:publish on deploy, the live answer check skipped). Turned back on at the end of 2a:
switch `docs:publish` from the raw files (which now open with YAML) to the loader's processed
Markdown, remove the line, `docs:publish`, `docs:answers:on`, then `cf:ai-check`.

Also queued (not in the order above): `git:tidy` (shared task for merged branches and worktrees).

## Look (from `browser:shots`, 2026-09-26)

- The home page is a heading and two buttons above an empty screen: it needs its content.
- The "Site page · works without JavaScript" / "App · needs JavaScript" badge shows on every page: a
  developer label; move it out of the visitor's way.
- Docs sidebar and other navigation hyphenate ("develop-ment"): hyphenation belongs to body text only.
- Search results show raw Markdown (backticks) and a heavy yellow highlight.
- Formats, "Available languages": Arabic and Persian names scramble the English list; isolate each name.
- Docs pages open with repository links ("Back to the README · Mise tasks") meant for GitHub.
- Formats on desktop uses a third of the width.

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
