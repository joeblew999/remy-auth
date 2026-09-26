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

## Next

- **Layout contract** (owner: "It's not just docs! It's everything ... a big change but it's worth it"): every path,
  file and setting the shared tasks and package rely on, written once in tasks/README.md, checked by a
  shared `project:layout` in tier 0, both apps brought to it. Inventory running; after the one-writer
  translation tools (`i18n:*`, shared) land.

- **Translations through upstream tools** ([plan](translation-pipeline.md), with issue #4): replace our
  translation code and checks with upstream tools behind shared mise tasks, same in every app; analysis next.

- **`git:tidy`** (shared task, from repeated manual cleanup): list local and GitHub branches fully merged
  into `main` and their worktrees; remove the local ones; `--remote` deletes merged GitHub branches (owner
  confirms). Until then: `shadcn-stock` and `tanstack` on GitHub are merged leftovers, safe to delete.

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
