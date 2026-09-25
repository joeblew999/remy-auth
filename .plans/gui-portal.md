# Hosted auth portal GUI and search follow-up

Status: open, 2026-09-24. Split from the [done GUI plan](done/gui.md), which holds the
rendering strategy, package rules, internationalisation and SEO acceptance these items
follow. Owner: remy-auth. Executor/Reviewer roles as in [plans and roles](../docs/development.md#plans-and-roles).

## Needs the auth service

1. **Hosted login flow and protected account screen** in this Worker, built from the shared
   shadcn components, noindex, with server-side authorization (done plan: "Shared package
   and hosted portal").
2. **Same-tab hosted login from remy-auth-app**, preserving theme, language and return
   route through the registered callback; no popup (done plan, slice step 3).
3. **Login, logout and denied-access checks** added to the shared checks, run by both
   repositories (done plan, slice step 5).
4. **Better Auth UI evaluation** against the Base UI variant, Paraglide, routing and
   accessibility before adopting it.

## Needs an owner decision

5. **Arabic catalog review**: the translations are agent-written and marked unreviewed.
6. **Structured data**: a schema.org type for the public pages, or "none applies".
7. **Security headers**: CSP with a nonce (the pinned TanStack Router takes one through its
   `ssr: { nonce }` router option and puts it on the scripts and head tags it renders; to be
   proven with a strict CSP), HSTS, COOP and frame control, which Lighthouse reports as informative; a strict CSP can break the app,
   so the rollout needs the owner's call.
8. **Search Console**: URL Inspection and field performance after a public deployment on
   the production origin, which also needs choosing (done plan, slice step 6).
9. **Remy's own migration** to this pattern happens in that repository, not here.
