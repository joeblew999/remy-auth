# Now: the owner's open requests, in order

One checked list of everything the owner has asked for that is not finished. Tick an item only
when it is on main, released and deployed where that applies, with its checks passing; link the
evidence. Each item's detail lives in the plan it links to.

- [x] TanStack Start, Router and Query in both apps, with the showcase: 0.9.0 and 0.9.1 released,
      both apps live ([plan](tanstack.md)).
- [x] Hands-on feel pass and its four fixes ([findings](tanstack.md#hands-on-pass-2026-09-25)).
- [x] Fonts: generic families only, one home (`packages/ui/src/fonts.css`), enforced by a check.
- [x] `mise run cf:preview`: a branch preview beside production, checked.
- [x] Shared tasks pinned to the release tag; `MISE_ENV=dev` and `mise.local.toml` for development
      ([tasks README](../tasks/README.md)).
- [x] Test tiers: `project:test:quick` for the edit loop; level 1 faster (19 s to 13.5 s).
- [x] remy-auth-app: formats settings in the address on a prerendered page (0.9.2; live, 33 checks).
- [x] Location from the browser as well as Cloudflare's, in both apps (0.9.3; live; becomes a
      part with the parts work).
- [ ] All in on shadcn (branch `shadcn-stock`, preview https://shadcn-remy-auth.gedw99.workers.dev):
      shadcn's monorepo layout, CLI-written theme and components, sidebar-16 app shell, site and app
      pages kept apart. Left: remy-auth-app on the new package, merge, release 0.10.0, deploy.
- [ ] Parts: spike, then convert the existing parts ([plan](parts.md)).
- [ ] Formats page regrouped, then ten more languages and the hard localisation features
      ([plan](hard-localisation.md)).
- [ ] Contract-first APIs: spike oRPC 2.0 against 1.15, then build ([plan](openapi-contracts.md)).
- [ ] Close the TanStack plan: move it to `done/`, update `docs/gui.md` and the READMEs.
- [ ] Cloudflare alert policy "alert rules firing and recovered" ([plan](observability.md)).

## Rough edges found along the way

Each is small; fix or decide, then delete the line.

- One remote check fails now and then right after `cf:preview` uploads, even after waiting for the
  new version at `/healthz`; the rerun passes. Find which check and why.
- `shadcn apply` reinstalls components and writes `"use client"` differently from `shadcn add` for
  `label` and `separator`, so `ui:theme` applies the theme only. Report upstream (owner's call).
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
