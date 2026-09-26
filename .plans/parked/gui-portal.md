# Hosted auth portal GUI and search follow-up

Parked 2026-09-26 (owner: "Not big feature stuff"): not started now; picked up as its own project.

Status: open, 2026-09-24. Split from the [done GUI plan](../done/gui.md), which holds the
rendering strategy, package rules, internationalisation and SEO acceptance these items
follow. Owner: remy-auth. Executor/Reviewer roles as in [plans and roles](../../docs/content/dev/development.md#plans-and-roles).

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
   - Step 3, enforce: built 2026-09-26 (decided by the orchestrator on the owner's delegation), not
     deployed; the lead checks the live `csp_report` lines before merging.
     - One switch: `cspEnforced` in `src/csp.ts` (a constant, default `true`), read by the
       middleware, which sends the same policy as `Content-Security-Policy` when true and as
       `Content-Security-Policy-Report-Only` when false. `report-uri` and `report-to` stay in both,
       so violations are still reported (now with `disposition` `enforce`). Why a constant and not a
       Worker variable: the checks import the same value (`tests/gui.spec.ts` passes it to
       `serverAppChecks({ cspEnforced })`), so the header they expect can never differ from the one
       sent; going back to report-only is one line and a deploy (or `wrangler rollback`).
     - `cspChecks({ enforce })` (default true): exactly one nonce policy under that mode's header and
       none under the other; the not-found page (404) is checked too; enforced, a page served with one
       extra inline script without the nonce does not run it and reports `script-src-elem enforce`.
       Nothing loosened: the old assertions stay, on the header the mode names.
     - Fixed while building it: the not-found and error pages went out with **no** nonce policy at
       all (report-only or enforced), although their scripts carry the nonce. Start merges headers set
       with `setResponseHeader` only into successful responses (`mergeEventResponseHeaders` in
       `@tanstack/start-server-core` 1.169.37 returns early unless `response.ok`, then copies only
       `Set-Cookie`). The middleware now sets both headers on the response `next()` returns. Measured:
       `/en/zz` and `/ar/app/zz` from 0 to 1 nonce policy, 5 of 5 scripts nonced.
     - What the enforced policies block (the nonce policy, plus withObservability's separate
       `frame-ancestors 'none'` policy; browsers enforce both):

       | Directive | Blocks | What this code does | Result |
       | --- | --- | --- | --- |
       | `script-src 'nonce-…' 'strict-dynamic'` | every `<script>` and `<link rel="modulepreload">` without the response's nonce, inline event handlers (`onclick="…"`), `javascript:` URLs, `eval`/`new Function` (no `'unsafe-eval'`); scripts a nonced script loads are allowed (`'strict-dynamic'`, so Vite's chunks load) | TanStack puts the nonce on every script and head tag (`ssr.nonce`, `ScriptOnce` for the theme script included); 0 inline handlers, 0 `javascript:` URLs; Zod's eval probe already off (`jitless`) | allowed |
       | `script-src` as the fallback for `worker-src` | Web Workers and service workers | none registered | nothing to block |
       | `object-src 'none'` | `<object>`, `<embed>` | none | nothing to block |
       | `base-uri 'none'` | `<base>` | none | nothing to block |
       | `frame-ancestors 'none'` (separate policy) | any page framing ours | we are never framed | as today since step 1 |
       | styles (no `style-src`, no `default-src`) | nothing | 3,589 inline `style` attributes over 221 pages (Radix/Base UI positioning, shadcn), one inline `<style>` per page (Start's `inlineCss`) | not restricted, on purpose |
       | fonts, images, media (`font-src`, `img-src`, `media-src` absent) | nothing | fonts and images all from this origin (0 cross-origin requests measured) | not restricted |
       | `connect-src` absent | nothing | `/api`, server functions, `/csp-report`, Vite's HMR socket in dev: all same-origin | not restricted |
       | `form-action`, `frame-src` absent | nothing | forms post to this origin; no iframes | not restricted |

       remy-auth-app's cross-origin status call (`/api/status` from its own pages) is governed by
       remy-auth-app's policy (it sends only `frame-ancestors`) and by our CORS for registered
       origins; the policy on our JSON response does not apply to a fetch. Why not add `style-src`,
       `default-src` and the rest: Radix and Base UI set inline `style` attributes at runtime, which
       only `'unsafe-inline'` (or per-value `'unsafe-hashes'`) allows, so a `style-src` would either
       break them or protect nothing; a host allowlist beside `'strict-dynamic'` is ignored for
       scripts. This is the strict-CSP shape Google and OWASP recommend (nonce, `'strict-dynamic'`,
       `object-src`, `base-uri`); tightening further is a separate decision.
     - Cloudflare's injected scripts: production runs on workers.dev, where nothing is injected. On
       a zone with JavaScript Detections (Bot Fight Mode), Cloudflare reads the nonce from the CSP
       response header and adds it to the script it injects, served from `/cdn-cgi/challenge-platform/`
       (Cloudflare docs, "JavaScript Detections", "If you have a CSP"); Web Analytics' automatic
       injection, Rocket Loader, Email Address Obfuscation and Zaraz would need checking then, when a
       custom domain is chosen (item 8).
     - Numbers (local measurement, `wrangler dev --local` on the build, 13 languages × 16 pages plus
       the not-found page = 221 responses, headless Chromium): 221 of 221 with one enforced nonce
       policy and no report-only header; 1,287 of 1,287 executable scripts carry the nonce; 0
       violations while loading and hydrating (14,023 requests, 0 cross-origin); the probe script
       without the nonce did not run and was reported as `script-src-elem enforce`; `/csp-report`
       answers 204 to an `enforce` report. Development server (`vite dev`, English, 16 pages): 94 of
       94 scripts nonced, 0 violations, the devtools and HMR included. Without JavaScript, pages
       render as before (CSP does not touch HTML or CSS): 208 of 221 have an `h1`, the other 13 are
       `/app/demo`, which has none with JavaScript either.
   - Remaining: deploy step 3 after the lead's check of live reports; step 4,
     raise HSTS `max-age` (to a year, then consider `includeSubDomains` and preload) once HTTPS on
     every host of the production origin is confirmed.
8. **Search Console**: URL Inspection and field performance after a public deployment on
   the production origin, which also needs choosing (done plan, slice step 6).
9. **Remy's own migration** to this pattern happens in that repository, not here.
