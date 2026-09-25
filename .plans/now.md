# Now: the owner's open requests, in order

One checked list of everything the owner has asked for that is not finished. Tick an item only
when it is on main, released and deployed where that applies, with its checks passing; link the
evidence. Each item's detail lives in the plan it links to.

- [x] TanStack Start, Router and Query in both apps, with the showcase: 0.9.0 and 0.9.1 released,
      both apps live ([plan](done/tanstack.md)).
- [x] Hands-on feel pass and its four fixes ([findings](done/tanstack.md#hands-on-pass-2026-09-25)).
- [x] Fonts: generic families only, one home (`packages/ui/src/fonts.css`), enforced by a check.
- [x] `mise run cf:preview`: a branch preview beside production, checked.
- [x] Shared tasks pinned to the release tag; `MISE_ENV=dev` and `mise.local.toml` for development
      ([tasks README](../tasks/README.md)).
- [x] Test tiers: `project:test:quick` for the edit loop; level 1 faster (19 s to 13.5 s).
- [x] remy-auth-app: formats settings in the address on a prerendered page (0.9.2; live, 33 checks).
- [x] Location from the browser as well as Cloudflare's, in both apps (0.9.3; live; becomes a
      part with the parts work).
- [x] All in on shadcn and TanStack, site pages apart from app pages: 0.10.0 released, both apps
      live (remy-auth-app 38 of 38 checks live; remy-auth 60 of 61, see the next item).
- [ ] remy-auth's /en/formats misses Google's simulated mobile LCP live (2.62-2.75 s against
      2.5 s; a real throttled trace shows 1.3 s). Owner: nothing is removed from the page. Next:
      trace what the site page loads that it does not need first, then regroup the page.
- [ ] Formats also as an app page (/app/formats), same component in the app frame, if the owner
      wants it.
- [ ] Parts: spike, then convert the existing parts ([plan](parts.md)).
- [x] Ten more languages and the hard localisation features: 13 languages, 0.10.5 released,
      both apps live (remy-auth 237 checks, remy-auth-app 140 and Core Web Vitals 3 of 3)
      ([plan](hard-localisation.md)).
- [ ] Contract-first APIs: spike oRPC 2.0 against 1.15, then build ([plan](openapi-contracts.md)).
- [x] Close the TanStack plan: moved to [`done/`](done/tanstack.md), `docs/gui.md` and the package
      README brought up to date.
- [ ] Cloudflare alert policy "alert rules firing and recovered" ([plan](observability.md)).

## Queued: what cannot be done yet, what it waits for, in order

Agents running on 2026-09-25: batch 1 (A to F), batch 2 (security headers, structured data,
formats speed), batch 3 (TanStack Form, Zod adapter, Devtools), a docs audit and a tooling review.

| # | Work | Waits for | Then |
| --- | --- | --- | --- |
| 1 | Batch 3 merged (TanStack Form, Zod schema, TanStack Devtools); release 0.10.3, deploy | release gate | remy-auth-app moves to 0.10.3 |
| 2 | ~~Merge batch 1~~ done 2026-09-25: remy-auth-app live on 0.10.2 (32 of 32 live), TanStack plan in done/, alert policy created | | |
| 3 | Docs refactor: first pass merged 2026-09-25 (one home per fact, two rulebooks split); second pass: `docs/gui.md` evidence section, now.md history lines | | |
| 4 | Tooling fixes first pass merged (sequential release gate, rollout wait, per-agent ports, cf:urls, project:upgrade-ui); second pass: docs for the new tasks, remy-auth-app CI | | shared tasks released with 0.10.3 |
| 5 | Formats speed: TanStack Start's `inlineCss`; Core Web Vitals judged on a Cloudflare preview (`project:test:cwv`), thresholds unchanged (decided 2026-09-25) | release 0.10.3 | Google's level green on production |
| 6 | Structured data on the site pages | batch 2, structured data | check in the server HTML |
| 7 | Security headers rollout, report-only first | batch 2 report and **owner decision** | enforce after a clean report period |
| 8 | Contract-first APIs: build items 2 to 6 on oRPC 1.15.4 (chosen from the spike) | ready | status and reservation endpoints |
| 9 | Parts: convert the existing parts with candidate 2 (virtual module, chosen from the spike) | ready | one line per part in each app |
| 10 | ~~Ten more languages~~ done 2026-09-25: 0.10.5, both apps live | | native-speaker review (owner) |
| 11 | ~~Auth service decisions 1 to 6~~ done 2026-09-25: runtime proven (Better Auth 1.7.6 on D1), decisions drafted, sharing examples written, all confirmed by the owner | | |
| 12 | Auth service milestone 1: Better Auth on D1, issuer, sample app | ready | login screens |
| 13 | Auth portal screens from shadcn's login and signup blocks; admin lists on TanStack Table | 12 | shared login checks |
| 14 | remy-auth-app runs the consumer contract set, not the whole package suite | 4 | faster consumer gates |
| 15 | Caching: spike Workers Caching against prerendered site pages on a preview, then build ([plan](caching.md)) | load to settle; decisions 1 to 4 in the plan (delegated: recommendation first) | cached site pages, private app pages |
| 16 | ~~Docs section and AI answers~~ done 2026-09-25: docs at /docs (server-rendered, lighter pages), search at /docs/search (Fumadocs, no AI), ask at /docs/ask (AI Search remy-docs-pages reads the R2 bucket remy-docs; `docs:publish` after every `cf:deploy`); old indexes and upload code deleted ([plan](docs-ai-sync.md)) | | review later (22) |
| 17 | ~~Language test tiers~~ done 2026-09-25: deploys run no tests unless GATE=1 (quick tier, 4 languages); releases run every language ([rule](../docs/how-we-work.md)) | | |
| 18 | Fonts by writing system, font order fix, font check, fonts in the formats page ([plan](fonts.md)) | agent analysis; three owner decisions in the plan | |
| 19 | Formats: every area for the page's language, every choice from the system's languages ([plan](formats-consistency.md)) | agent analysis | |
| 20 | ~~GitHub Actions off Node.js 20~~ done 2026-09-25: upload-artifact v7.0.1, Dependabot keeps actions current ([plan](ci-node24.md)) | | |
| 21 | Publisher and consumers checked: new-consumer recipe, drift, more in the include, docs and AI answers for every consumer, fewer scripts ([plan](publisher-consumer.md)) | agent analysis | |
| 23 | ~~Docs search on the site (route A) and AI answers from R2 (route B)~~ done 2026-09-25, see 16 | | |
| 22 | Docs site review: what went wrong, design, operations, efficiency ([plan](docs-site-review.md)) | owner, later | |
| 24 | Release the shared UI (0.10.6: the lighter site frame module `shell`, SiteNavLinks, one-language pages) and move remy-auth-app to it; remy-auth-app is live on 0.10.5 | ready | |

Decisions only the owner can make: the security headers rollout (7), launching the auth
decisions (11) and confirming them, a native-speaker review of the Arabic and new catalogs, the
production origin and Search Console, filing upstream issues (shadcn apply and "use client";
fontaine and Tailwind's inline theme), and deleting old Cloudflare preview versions.

## Rough edges found along the way

Each is small; fix or decide, then delete the line.

- `shadcn apply` reinstalls components and writes `"use client"` differently from `shadcn add` for
  `label` and `separator`, so `ui:theme` applies the theme only. Report upstream (owner's call).
  Adding `table` to `ui:components` flips it again for `field`, `sheet` and `sidebar` (stable once
  regenerated; docs-site branch).
- fontaine 1.0.0 cannot add its fallback names inside Tailwind's `@theme inline`, so `fonts.css`
  lists them by hand; it also emits two differing `size-adjust` faces for Geist. Report upstream.
- Lighthouse's simulated mobile LCP (2.5 s budget) runs about twice a real throttled trace (1.3 s
  for /en/formats), so small byte changes flip it; worth a trace-based second opinion in the check.
- Outside a mise task, mise's Node shim reapplies `[env]` (a hand-run build got the wrong
  `PUBLIC_ORIGIN`); run builds through mise tasks.
- The time zone pages have no page of their own in the navigation: they are reached from a zone.
- The demo's loading placeholder was removed (it duplicated the app frame); app pages rendered only
  in the browser show nothing until their script runs.
- `@shadcn/sidebar-16` lands in the app when added; for a shared shell it was moved into the package
  (`packages/ui/src/blocks/sidebar-16`) by hand, so `shadcn add` cannot update it later.
