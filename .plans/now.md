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
- [ ] remy-auth-app: formats settings in the address on a prerendered page (release 0.9.2).
- [ ] Location from the browser as well as Cloudflare's, in both apps, as a part.
- [ ] Parts: spike, then convert the existing parts ([plan](parts.md)).
- [ ] Formats page regrouped, then ten more languages and the hard localisation features
      ([plan](hard-localisation.md)).
- [ ] Contract-first APIs: spike oRPC 2.0 against 1.15, then build ([plan](openapi-contracts.md)).
- [ ] Close the TanStack plan: move it to `done/`, update `docs/gui.md` and the READMEs.
- [ ] Cloudflare alert policy "alert rules firing and recovered" ([plan](observability.md)).
