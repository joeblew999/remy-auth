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
6. **Structured data**: done 2026-09-25 (decided by the orchestrator on the owner's delegation):
   schema.org `WebSite` (name `Remy`, `url` the site root) on the site home page in every
   language and nowhere else, from the shared `pageHead` through TanStack's `script:ld+json` head
   entry. Why `WebSite` alone: the site has no organization, product or article facts to state;
   Google reads `WebSite` for the site name. `publicPageChecks` proves exactly one block with that
   object in the server's HTML and still one after hydration (TanStack Router issue #6627);
   `zoneChecks` proves none on other site pages or app pages. Remaining: none unless the site
   gains facts another schema.org type describes.
7. **Security headers**: steps 1 and 2 done 2026-09-25 (rollout decided by the orchestrator on
   the owner's delegation).
   - Step 1, in the shared `withObservability` on every response: `Content-Security-Policy:
     frame-ancestors 'none'` for frame control (CSP's directive supersedes `X-Frame-Options`, per
     MDN and OWASP; appended, so a page's own enforced policy also applies),
     `Cross-Origin-Opener-Policy: same-origin-allow-popups` (sign-in popups keep their opener) and
     `Strict-Transport-Security: max-age=300`. `observabilityChecks` asserts all three.
   - Step 2, report-only: Start request middleware `cspNonce` (`src/middleware.ts`, registered in
     `src/start.ts`) makes a 128-bit nonce per request and sends `Content-Security-Policy-Report-Only:
     script-src 'nonce-…' 'strict-dynamic' 'report-sample'; object-src 'none'; base-uri 'none';
     report-uri /csp-report; report-to csp` with `Reporting-Endpoints: csp="/csp-report"`;
     `getRouter` passes the nonce to TanStack Router's `ssr.nonce`. The server route
     `src/routes/csp-report.ts` takes both report formats and writes one `csp_report` line per
     violation in the shared log contract, with bounded fields only (`directive`,
     `disposition`, the page's route template, `blocked` as a keyword or `external`): never the
     URL or the sample (checked by hand with canaries in both). `report-uri` is kept beside
     `report-to` because Firefox and Safari do not send Reporting API reports yet.
   - Found while proving it: Zod 4 probes for eval (`Function('')`) on app pages, a violation the
     earlier research missed. Fixed with Zod's documented `z.config({ jitless: true })` in
     `packages/ui/src/reservation.ts`, not by loosening the policy.
   - `cspChecks` (every page): the policy names a fresh nonce per response, every executable
     script in the server's HTML carries it (data blocks such as `application/ld+json` are not
     scripts to CSP and TanStack renders them without one), no page violates the policy while
     loading and hydrating, and the report endpoint answers. The app-page robots check accepts the
     `nonce` attribute TanStack now puts on head tags; same assertion otherwise.
   - Remaining: step 3, enforce (switch the header to `Content-Security-Policy`) after a clean
     report period in production `csp_report` lines, with the owner's go-ahead to deploy; step 4,
     raise HSTS `max-age` (to a year, then consider `includeSubDomains` and preload) once HTTPS on
     every host of the production origin is confirmed.
8. **Search Console**: URL Inspection and field performance after a public deployment on
   the production origin, which also needs choosing (done plan, slice step 6).
9. **Remy's own migration** to this pattern happens in that repository, not here.
