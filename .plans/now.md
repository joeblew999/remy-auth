# Now: the owner's open requests, in order

One checked list of everything the owner has asked for that is not finished. Tick an item only
when it is on main, released and deployed where that applies, with its checks passing; link the
evidence. Each item's detail lives in the plan it links to. Git history holds the rest.

- [x] TanStack Start, Router and Query in both apps, with the showcase: 0.9.0 and 0.9.1 released,
      both apps live ([plan](done/tanstack.md)).
- [x] Hands-on feel pass and its four fixes ([findings](done/tanstack.md#hands-on-pass-2026-09-25)).
- [x] Fonts: generic families only, one home (`packages/ui/src/fonts.css`), enforced by a check.
- [x] `mise run cf:preview`: a throwaway Worker per commit, tested then deleted (a001c19).
- [x] Shared tasks pinned to the release tag; `MISE_ENV=dev` and `mise.local.toml` for development
      ([tasks README](../tasks/README.md)).
- [x] Test tiers 0 to 4 and `GATE` on deploys (2162b7b; [rule](../docs/how-we-work.md#gates-before-anything-leaves-the-machine)).
- [x] remy-auth-app: formats settings in the address on a prerendered page (0.9.2; live, 33 checks).
- [x] Location from the browser as well as Cloudflare's, in both apps (0.9.3; live; becomes a
      part with the parts work).
- [x] All in on shadcn and TanStack, site pages apart from app pages: 0.10.0 released, both apps
      live.
- [x] ~~Formats also as an app page~~ done: `/app/formats` (`src/routes/app.formats.tsx`), the same
      `FormatsContent` in the app frame.
- [x] Ten more languages and the hard localisation features: 13 languages, 0.10.5 released,
      both apps live ([plan](hard-localisation.md)).
- [x] ~~Contract-first spike~~ done 2026-09-25: oRPC 1.15.4 chosen over 2.0
      ([plan](openapi-contracts.md#decisions)); the build continues in row 8.
- [x] ~~Cloudflare alert policy "alert rules firing and recovered"~~ created 2026-09-25 (id in
      [the observability plan](observability.md)); it emails once a rule exists.
- [x] Close the TanStack plan: moved to [`done/`](done/tanstack.md).
- [ ] remy-auth's /en/formats and Google's mobile LCP: the fix shipped in 0.10.3 (`inlineCss`,
      367ef76) and Core Web Vitals are now judged on a Cloudflare preview (`project:test:cwv`,
      da9d76c; remy-auth-app passes, 0d460f9). Open: no recorded remy-auth run on the current
      commit; run `project:test:cwv` once and link it here.
- [ ] Parts: convert the existing parts (row 9, [plan](parts.md)).

## Queued: what cannot be done yet, what it waits for, in order

| # | Work | Waits for | Then |
| --- | --- | --- | --- |
| 1 | ~~Release 0.10.3 (TanStack Form, Zod schema, Devtools)~~ done 2026-09-25: da9d76c; remy-auth-app on 0.10.3 (e7390fd), now 0.10.5 | | |
| 2 | ~~Merge batch 1~~ done 2026-09-25: remy-auth-app live on 0.10.2, TanStack plan in done/, alert policy created | | |
| 3 | ~~Docs refactor~~ done 2026-09-25: first pass (one home per fact, two rulebooks split); second pass (`docs/gui.md` evidence, now.md history lines) on the plans-docs tidy-up branch | | |
| 4 | ~~Tooling fixes~~ done 2026-09-25: sequential release gate, rollout wait (`cf:wait`), per-agent ports, `cf:urls` (bc8e665), `project:upgrade-ui` (788ffb5), docs for the new tasks ([tasks README](../tasks/README.md), [tooling](../docs/tooling.md)); remy-auth-app CI moves to 21 | | |
| 5 | ~~Formats speed~~ done 2026-09-25: `inlineCss` (367ef76), Core Web Vitals on a preview, thresholds unchanged; one remy-auth run still to record (checklist above) | | |
| 6 | ~~Structured data on the site pages~~ done 2026-09-25: WebSite on the home page (6676ac6), checked (173ea97) | | |
| 7 | Security headers: static headers (be82e16) and report-only CSP (36184b8) done; step 3, enforce ([plan](gui-portal.md)) | a clean report period and **owner decision** | `Content-Security-Policy` enforced |
| 8 | Contract-first APIs: items 2, 3 and 5 done on oRPC 1.15.4 (05d2511, 61c2ed7); item 4 built (CORS for registered origins, shared status card, remy-auth-app branch `contract-status-card`), item 6 wired but not run ([plan](openapi-contracts.md#progress-and-decisions-2026-09-25-items-4-and-6)) | release, deploy remy-auth, then remy-auth-app | the contract published, consumers on it |
| 1 | Batch 3 merged (TanStack Form, Zod schema, TanStack Devtools); release 0.10.3, deploy | release gate | remy-auth-app moves to 0.10.3 |
| 2 | ~~Merge batch 1~~ done 2026-09-25: remy-auth-app live on 0.10.2 (32 of 32 live), TanStack plan in done/, alert policy created | | |
| 3 | Docs refactor: first pass merged 2026-09-25 (one home per fact, two rulebooks split); second pass: `docs/gui.md` evidence section, now.md history lines | | |
| 4 | Tooling fixes first pass merged (sequential release gate, rollout wait, per-agent ports, cf:urls, project:upgrade-ui); second pass: docs for the new tasks, remy-auth-app CI | | shared tasks released with 0.10.3 |
| 5 | Formats speed: TanStack Start's `inlineCss`; Core Web Vitals judged on a Cloudflare preview (`project:test:cwv`), thresholds unchanged (decided 2026-09-25) | release 0.10.3 | Google's level green on production |
| 6 | Structured data on the site pages | batch 2, structured data | check in the server HTML |
| 7 | Security headers rollout, report-only first | batch 2 report and **owner decision** | enforce after a clean report period |
| 8 | Contract-first APIs: build items 2 to 6 on oRPC 1.15.4 (chosen from the spike) | ready | status and reservation endpoints |
| 9 | Parts: convert the existing parts with candidate 2 (virtual module, chosen from the spike). First pass 2026-09-25: the mechanism and `time-zones`; the rest need the designs in [the plan](parts.md#conversion-first-pass-2026-09-25) | ready | one line per part in each app |
| 10 | ~~Ten more languages~~ done 2026-09-25: 0.10.5, both apps live | | native-speaker review (owner) |
| 11 | ~~Auth service decisions 1 to 6~~ done 2026-09-25: runtime proven (Better Auth 1.7.6 on D1), all confirmed by the owner | | |
| 12 | Auth service milestone 1: Better Auth on D1, issuer, sample app | ready | login screens |
| 13 | Auth portal screens from shadcn's login and signup blocks; admin lists on TanStack Table | 12 | shared login checks |
| 14 | remy-auth-app runs the consumer contract set, not the whole package suite | ready | faster consumer gates |
| 15 | Caching: spike Workers Caching against prerendered site pages on a preview, then build ([plan](caching.md)) | load to settle; decisions 1 to 4 in the plan (delegated: recommendation first) | cached site pages, private app pages |
| 16 | ~~Docs section and AI answers~~ done 2026-09-25: /docs, /docs/search, /docs/ask; `docs:publish` after every `cf:deploy` ([plan](docs-ai-sync.md)) | | review later (22) |
| 17 | ~~Language test tiers~~ done 2026-09-25, since replaced by tiers 0 to 4 and `GATE` (2162b7b, [rule](../docs/how-we-work.md#gates-before-anything-leaves-the-machine)) | | |
| 18 | Fonts by writing system, font order fix, font check, fonts in the formats page ([plan](fonts.md)) | measured and decided 2026-09-26 (300 KB budget, Han on system fonts, Vazirmatn for Persian); fonts rows on the formats page remain | |
| 19 | Formats: every area for the page's language, every choice from the system's languages ([plan](formats-consistency.md)) | agent analysis | |
| 20 | ~~GitHub Actions off Node.js 20~~ done 2026-09-25 ([plan](ci-node24.md)) | | |
| 21 | Publisher and consumers checked: new-consumer recipe, drift, more in the include, docs and AI answers for every consumer, remy-auth-app CI (it has no workflow yet), fewer scripts ([plan](publisher-consumer.md)) | agent analysis | |
| 22 | Docs site review: what went wrong, design, operations, efficiency ([plan](docs-site-review.md)) | owner, later | |
| 23 | ~~Docs search on the site (route A) and AI answers from R2 (route B)~~ done 2026-09-25, see 16 | | |
| 24 | ~~Release the shared UI and move remy-auth-app~~ done 2026-09-25: remy-ui 0.11.0 and contract 0.2.0 released; both apps live on 0.11.0 | | |

Decisions only the owner can make: enforcing the security headers (7), a native-speaker review of
the Arabic and new catalogs, the production origin and Search Console, filing upstream issues
(shadcn apply and "use client"; fontaine and Tailwind's inline theme), and deleting old Cloudflare
versions of the production Worker (check Workers go with `cf:preview-delete`).

## Rough edges found along the way

Each is small; fix or decide, then delete the line.

- `shadcn apply` reinstalls components and writes `"use client"` differently from `shadcn add` for
  `label` and `separator`, so `ui:theme` applies the theme only. Report upstream (owner's call).
  Adding `table` to `ui:components` flips it again for `field`, `sheet` and `sidebar` (stable once
  regenerated).
- fontaine 1.0.0 cannot add its fallback names inside Tailwind's `@theme inline`, so `fonts.css`
  lists them by hand; it also emits two differing `size-adjust` faces for Geist. Report upstream.
- Lighthouse's simulated mobile LCP (2.5 s budget) runs about twice a real throttled trace (1.3 s
  for /en/formats), so small byte changes flip it; worth a trace-based second opinion in the check.
- Outside a mise task, mise's Node shim reapplies `[env]` (a hand-run build got the wrong
  `PUBLIC_ORIGIN`); run builds through mise tasks.
- The time zone pages have no page of their own in the navigation: they are reached from a zone.
- The demo's loading placeholder was removed (it duplicated the app frame); app pages rendered only
  in the browser show nothing until their script runs.
