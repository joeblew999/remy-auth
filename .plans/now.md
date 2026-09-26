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

Owner, 2026-09-26: "there is so much to be aligned and done in the right order. I want to not do any more
manual translation until the docs and Paraglide stuff is solved, as it will slow us down." Structure first,
then tools, then translating.

0. **Translation frozen** (from 2026-09-26): no translation passes, by agents or by hand; stale
   translations are a warning everywhere, the release included, until step 4.
1. **Finish what is in flight** (English only): the layout contract and `project:layout`; the Look fixes
   (below).
2. **Structure, in parallel:**
   - a. **Docs conform to Fumadocs as shadcn does** ([plan](docs-for-consumers.md#how-shadcn-does-it-apps-v4-at-98a1fe6-2026-09-26)):
     frontmatter `title` and `description` on the English docs, a `loader()` from `docsTable`, search via
     `createFromSource`; deletes our hand-built titles, descriptions, navigation and search index.
   - b. **Paraglide plurals** ([plan](translation-pipeline.md)): `=*` as the fallback in the catalogs and the
     plural-categories test.
3. **Translation tooling** ([plan](translation-pipeline.md)): git, jq and i18n-check through shared mise
   tasks, the `claude -p` writer step; delete `i18n.mjs`, the provenance lines and their plugin.
4. **Unfreeze:** one translation pass with the new tools (Spanish docs with frontmatter, missing catalog
   keys); the release check back to strict.
5. **What conforming docs unlock** ([plan](docs-for-consumers.md)): `.md` pages, `llms.txt`, the copy
   menu; then docs for apps: a rules section in how-we-work, the `remy` skill (rules, evals) in the
   package, the `AGENTS.md` block pointing into `node_modules`.
6. **Release and adopt:** the shared UI released, remy-auth-app moved onto it, proving the translation
   tasks and docs in an app.

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
- The production origin (a custom domain) and Search Console.
- More docs languages: drop files into `docs/i18n/<locale>/` (the plumbing is done; `mise run
  i18n:status` lists what each language still needs).

## Parked

[auth-service](parked/auth-service.md), [better-auth-ecosystem](parked/better-auth-ecosystem.md),
[gui-portal](parked/gui-portal.md), [remy-cli](parked/remy-cli.md) (one CLI instead of scripts): big, not now (owner: "Not big feature stuff").
