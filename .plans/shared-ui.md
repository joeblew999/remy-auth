# Shared UI for server- and client-rendered consumers

Status: proposed 2026-09-24. Owner: remy-auth. The Reviewer accepts against the checks
below; the Executor implements the work items in order and stops at the open decisions.
This plan answers one question: is the framework code designed to be shared by other
projects for both CSR and SSR, and does a demo show that off? Today: designed yes,
proven half, shown off no. It extends the "Shared package" section of the
[GUI plan](gui.md); the [development principles](../docs/development.md) apply.

## Evidence today

- `packages/ui` (`@remy/ui`, private, `0.0.0`, npm workspace) exports `button`,
  `styles.css`, `messages`, `locale` (locale list, `direction`, `localeName`) and
  `locale-info`. React is a peer dependency. Nothing imports React Router.
- This app consumes only those exports (`grep "from '@remy/ui/"` in `app/` and
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
| `@remy/ui/i18n` | `matchLocale(acceptLanguage)`, `chosenLocale(cookieHeader)`, `cookieName`, `rememberLocale(locale)` (no-op without `document`) | Pure functions; no framework, no globals at import time |
| `@remy/ui/seo` | `alternates(origin, path, locale)` returning canonical and hreflang entries as plain objects; `x-default` is the chooser path | Data only; React Router `meta` maps it, a SPA writes `<link>`s itself |
| `@remy/ui/language` | `LanguageSwitcher`, `LanguageHint`, `LanguageChooser` taking `locale`, `path`, `preferred`, `available` and callbacks as props, rendering plain anchors | No router import; a language change is a full navigation by design |
| `@remy/ui/locale`, `locale-info`, `messages`, `button`, `styles.css` | As today | Unchanged |

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
- Consumes `@remy/ui` as a published, versioned artifact, matching the GUI plan's rule
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

1. **Extract pure helpers.** Move locale matching, the cookie helpers and the
   alternates builder into `@remy/ui/i18n` and `@remy/ui/seo`; `app/` imports them.
   The existing suite must stay green unchanged.
2. **Extract components.** Move the switcher, hint and chooser into
   `@remy/ui/language` with props instead of router hooks; the app's shell and chooser
   routes become thin wrappers. Same suite, unchanged.
3. **Prove SSR for strangers.** Extend `scripts/verify-ui-package.mjs` to import every
   export in Node without a DOM and `renderToString` a page that uses the button,
   messages and language components, in addition to the client build. Fail on any
   browser global touched at import time.
4. **Build the consumer.** In `remy-auth-app`, following its plan: the same pages
   and checks in client rendering, consuming the published package. Record the package
   version it consumes; this repository's verification stays self-contained.
5. **Compare the two consumers.** One Playwright check renders the shared controls in
   both apps and compares their accessibility tree and computed styles, which is the
   GUI plan's "compare both apps' shared controls visually" without brittle pixels.
6. **Guard the boundary.** A verification step fails if `app/` or the sample imports
   anything from `packages/ui/src` or copies a helper that the package exports.

## Acceptance

- `mise run project:verify` is green here; `remy-auth-app`'s own verification is green against the published package version.
- `mise run ui:verify` proves both a client bundle and a server render from the tarball.
- Both consumers import only `@remy/ui/*`; the boundary guard passes.
- The sample passes every Lighthouse audit and the same language behaviour checks
  (chooser, remembered choice, hint) as this app, adapted to client rendering.
- Package README documents each export, what runs where, and the consumer's duties.

## Open decisions for the owner

1. **Sample rendering mode.** Recommended: React Router framework mode with
   `ssr: false`, so one router convention covers both modes and the contrast is explicit.
   Alternative: plain Vite plus React without a router, which proves less.
2. **Publication.** The package stays a private workspace until remy-sport or remy-data
   consume it. Where it is published (npm scope or GitHub Packages) and its first
   version are undecided.
3. **Sample deployment.** Local only, or its own Worker beside this one. Deploying is
   an explicit owner request either way.
4. **Component styling contract.** Whether `@remy/ui/language` ships its own CSS in
   `styles.css` or relies on consumer Tailwind classes; today the app styles them in
   `app/styles.css`.
