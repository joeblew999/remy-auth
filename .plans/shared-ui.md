# Shared UI for server- and client-rendered consumers

Status: proposed 2026-09-24. Owner: remy-auth. The Reviewer accepts against the checks
below; the Executor implements the work items in order and stops at the open decisions.
This plan answers one question: is the framework code designed to be shared by other
projects for both CSR and SSR, and does a demo show that off? Today: designed yes,
proven half, shown off no. It extends the "Shared package" section of the
[GUI plan](gui.md); the [development principles](../docs/development.md) apply.

## Evidence today

- `packages/ui` (`@joeblew999/remy-ui`, private, `0.0.0`, npm workspace) exports `button`,
  `styles.css`, `messages`, `locale` (locale list, `direction`, `localeName`) and
  `locale-info`. React is a peer dependency. Nothing imports React Router.
- This app consumes only those exports (`grep "from '@joeblew999/remy-ui/"` in `app/` and
  `workers/`) and exercises them in both modes on every run: server rendering in
  workerd, hydration and client-rendered routes in Chrome.
- `mise run ui:verify` (`scripts/verify-ui-package.mjs`) packs the real tarball,
  installs it into a temporary project with only React, and builds a Vite/Tailwind
  **client bundle** of a button plus messages. It never renders on a server, so SSR
  use by a stranger is assumed from this app, not proven for the package.
- Generic behaviour still lives in `app/`, so another project would copy it:
  `app/locale.ts` (Accept-Language matching, remembered-choice cookie),
  `app/preference.ts` (cookie write), `app/seo.ts` (canonical and hreflang set),
  `app/chooser.tsx` (language chooser), `app/shell.tsx` (switcher and language hint),
  `app/paths.ts` (public paths). The chooser and shell import React Router
  (`Link`, `useRouteLoaderData`, `redirect`), so they are not framework neutral.
- `examples/sample-app/`, the first planned consumer in the development principles,
  does not exist. The GUI plan's vertical slice step 3 (an independent sample using
  the packed package) is therefore still open.

## Outcome

One versioned package that a server-rendered app and a client-only app both consume
through public exports, a runnable second consumer (`remy-auth-app`) that shows the
same controls, theme, catalogs and language behaviour in client rendering, and checks
that fail when either mode breaks. No consumer reaches into `packages/ui/src` or
copies app code.

## Package contract to add

| Export | Contents | Rule |
| --- | --- | --- |
| `@joeblew999/remy-ui/locale` | Paraglide runtime re-exports: `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName`, `direction` (`getTextDirection`), plus `localeName` | No hand-written detection, cookie or direction code: Paraglide owns it |
| `@joeblew999/remy-ui/seo` | `alternates(origin, path, locale)` from Paraglide's URL patterns; `x-default` is the entry URL | Pure; usable in requests, at build time and in the browser |
| `@joeblew999/remy-ui/language` | `LanguageSwitcher`, `LanguageHint` on `localizeHref` and `setLocale`, styles in `styles.css` | Plain anchors; no chooser page (Paraglide redirects entry URLs) |
| `@joeblew999/remy-ui/react-router` | `languageMiddleware` (Paraglide's middleware as root middleware), `suggestedLocale`, `redirectToLocalized`, `pageMeta` | React Router glue, deliberately not neutral; `react-router` optional peer |
| `@joeblew999/remy-ui/client` | `useSuggestedLocale(page)`, `DeviceTime` | The browser half for prerendered apps |
| `@joeblew999/remy-ui/cloudflare` | `placeFromCloudflare(cf)` | Request geolocation as plain data |
| `@joeblew999/remy-ui/runtime` | The generated Paraglide runtime as plain JavaScript | For Node build configs |
| `@joeblew999/remy-ui/locale-info`, `messages`, `button`, `styles.css` | As before | Unchanged |

Owner principles 2026-09-24: what is shared must be the client and server sides working in
unison, not components alone; nothing framework neutral, the package targets React Router
and Paraglide directly; no reinvented wheels, so detection, cookie, URL localisation and
redirects are Paraglide's. The same principles apply to the mise tasks: since 2026-09-24 `tasks/` here holds the
agent bootstrap, the agent launchers, the Playwright runners and the Cloudflare wrappers,
included by remy-auth-app by git reference pinned to a commit; each project keeps only its
own pipeline tasks and Node pin. The compiler options in `packages/ui/paraglide.mjs` are the one source for
the Vite plugin and `ui:generate`.

Stays app-local: route modules, the Cloudflare load context and geolocation (runtime
specific), the formats page samples (demo content, not a contract), the Worker entry.
Document in the package README how a consumer supplies `preferred` and geolocation.

## The demo of reuse

Owner decision 2026-09-24: the demonstration is the separate
[remy-auth-app](https://github.com/joeblew999/remy-auth-app) repository, whose
[plan](https://github.com/joeblew999/remy-auth-app/blob/main/.plans/app.md) also covers
bootstrapping any project from this repository's tasks through mise includes. Being a
cross-repository consumer, it must install a versioned artifact, so open decision 2
(publication) is the first blocker rather than the last. `examples/sample-app/` stays
reserved for the authenticated in-repo sample described in the auth plan.

The consumer, wherever it lives, is the demonstration, not another page in this app:

- React Router framework mode with `ssr: false` (client rendering) so the route module
  conventions match this app while the rendering mode differs. Owner decision 1 below.
- Every public page is prerendered at build time, decided 2026-09-24 in the
  [remy-auth-app plan](https://github.com/joeblew999/remy-auth-app/blob/main/.plans/app.md):
  the GUI plan accepts public pages only with their content and metadata in the initial
  HTML, and Lighthouse executes JavaScript, so only the no-JavaScript checks prove that.
  Build-time loaders see no request, so the chooser prerenders neutrally and enhances
  in the browser, the hint is client-side, the canonical origin is a build variable,
  and the Cloudflare location section is omitted there as the honest SSR-only feature.
- Consumes `@joeblew999/remy-ui` as a published, versioned artifact, matching the GUI plan's rule
  that cross-repository consumers never use sibling filesystem paths.
- Shows the shared button and theme, the switcher, hint and chooser, the catalogs in
  English, Spanish and Arabic, and a subset of the formats rows, so a reader sees the
  same controls and behaviour rendered client-side next to this app's server-side pages.
- Owns its own mise tasks and Playwright checks, including Lighthouse with every audit
  gated, run from its own `project:verify`; this repository's verification stays
  self-contained.
- Contains no authentication yet; it becomes the protected sample when the auth slice
  lands, as the [auth plan](auth-service.md) describes.

## Work items, in order

1. **Extract pure helpers.** Done 2026-09-24 (0.2.0). Move locale matching, the cookie helpers and the
   alternates builder into `@joeblew999/remy-ui/i18n` and `@joeblew999/remy-ui/seo`; `app/` imports them.
   The existing suite must stay green unchanged.
2. **Extract components.** Done 2026-09-24 (0.2.0). Move the switcher, hint and chooser into
   `@joeblew999/remy-ui/language` with props instead of router hooks; the app's shell and chooser
   routes become thin wrappers. Same suite, unchanged.
3. **Prove SSR for strangers.** Done 2026-09-24: `ui:verify` builds and runs an SSR bundle from the tarball. Extend `scripts/verify-ui-package.mjs` to import every
   export in Node without a DOM and `renderToString` a page that uses the button,
   messages and language components, in addition to the client build. Fail on any
   browser global touched at import time.
4. **Build the consumer.** Done 2026-09-24: `remy-auth-app` runs the same pages and
   checks in prerendered client rendering on `@joeblew999/remy-ui@0.2.0`, with Paraglide's
   middleware at prerender time; its own gate passes (18 checks). This repository's
   verification stays self-contained.
5. **Compare the two consumers.** Done 2026-09-24 the stronger way: `@joeblew999/remy-ui/checks`
   (0.3.0) holds the public-page, entry, demo, formats and Lighthouse checks as Playwright
   factories, and both repositories run them, so the shared controls and language behaviour
   are verified identically in server and client rendering. Each repository keeps only the
   checks it owns.
6. **Guard the boundary.** Done 2026-09-24 (`scripts/verify-boundary.mjs`). A verification step fails if `app/` or the sample imports
   anything from `packages/ui/src` or copies a helper that the package exports.

## Acceptance

- `mise run project:verify` is green here; `remy-auth-app`'s own verification is green against the published package version.
- `mise run ui:verify` proves both a client bundle and a server render from the tarball.
- Both consumers import only `@joeblew999/remy-ui/*`; the boundary guard passes.
- The sample passes every Lighthouse audit and the same language behaviour checks
  (chooser, remembered choice, hint) as this app, adapted to client rendering.
- Package README documents each export, what runs where, and the consumer's duties.

## Open decisions for the owner

1. **Sample rendering mode.** Recommended: React Router framework mode with
   `ssr: false` and a `prerender` list, so one router convention covers both modes and
   the contrast is explicit. Alternative: plain Vite plus React without a router, which
   proves less and cannot prerender.
2. **Publication.** Decided 2026-09-24: GitHub Packages, because the registry is
   npm-compatible, the package stays linked to this repository, and a tag-triggered
   workflow publishes with its own `GITHUB_TOKEN` (no npm account or long-lived token).
   Both repositories became public the same day and the package is public on GitHub
   Packages; its npm registry still returns 401 without a token, so consumers need
   `read:packages` (confirmed 2026-09-24). Version 0.1.0 is published and consumed by
   remy-auth-app, whose `package:verify` builds a client bundle and a server render
   from it, which also covers work item 3's "prove SSR for strangers" for the current
   exports. GitHub requires the
   scope to equal the owner, so the package was renamed `@joeblew999/remy-ui`. The
   workflow (`.github/workflows/publish.yml`) follows the installed
   `github-actions-hardening` skill: deny-all permissions, `packages: write` on the one
   job, SHA-pinned actions with Dependabot updates, no secrets in scripts. Releases use
   the installed `github-release` skill (SemVer from the public diff, Keep a Changelog,
   release PR, then the tag). Still open: the first version number, and that consumers
   need a `read:packages` token even to install.
3. **Sample deployment.** Local only, or its own Worker beside this one. Deploying is
   an explicit owner request either way.
4. **Component styling contract.** Decided 2026-09-24: the package ships its components'
   CSS in `styles.css`, which every consumer already imports; apps keep only layout
   overrides such as narrow-screen padding.
