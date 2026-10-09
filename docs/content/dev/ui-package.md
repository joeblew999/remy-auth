---
title: "@joeblew999/remy-ui"
description: "The UI every Remy app shares: stock shadcn, fonts, Paraglide catalogs, the site and app pages, TanStack Start glue and its checks."
---

The UI every Remy app shares: stock shadcn components and theme, fonts, Paraglide catalogs and
locale helpers, the site and app pages, TanStack Start glue, and the Playwright checks that prove
them. Consumers are remy-auth (server-rendered) and
[remy-auth-app](https://github.com/joeblew999/remy-auth-app) (prerendered); both run the same checks.

## shadcn, stock

Everything in `src/components`, `src/hooks` and `src/styles/globals.css` is what the pinned shadcn
CLI writes (monorepo layout: the app's `components.json` routes `shadcn add` here), including `cn`
from shadcn's own `cn` package; nothing there is edited by hand. `mise run ui:components` and
`mise run ui:theme` regenerate them and `mise run ui:verify` fails on any drift (see
[docs/gui.md](./gui.md#shadcn-stock)). Blocks are owned copies in `src/blocks`.

## Usage

Import the package's stylesheet in the app's CSS (here `src/styles.css`), then tell Tailwind where
the app's own classes live. `tailwind.css` imports `globals.css`, `fonts.css` and `text.css` in
that order and declares the package's own `@source`:

```css
@import "@joeblew999/remy-ui/tailwind.css";
@source "../src";
```

`fonts.css` names fontaine's fallback faces; add `FontaineTransform.vite({ fallbacks: { 'Geist
Variable': ['Arial'] } })` before Tailwind in the Vite config (remy-auth's
[`vite.config.ts`](https://github.com/joeblew999/remy-auth/blob/main/vite.config.ts) is the example).

Every page is one of two kinds, never mixed (`paths`' `isAppPath` is the rule; each app lists its own):

- **Site pages** (the app's `sitePaths`), framed by `SiteShell`: complete without JavaScript, indexed, in the
  sitemap, judged by Lighthouse and Core Web Vitals.
- **App pages** (its `appPaths`, under `/app`), framed by `AppShell` (shadcn's sidebar-16 block): they need
  JavaScript and `pageHead` marks them `noindex`. `AppShell` has its own export so a site page never downloads it.
- **App navigation**: the app's own list, in its `defineRemyApp` config (`app-config`).

remy-auth's own pages (the home and formats pages, the app's formats, clock, demo, location, settings and
account pages, their navigation lists, the demo reservation and their checks) are not the platform's: they
are `@joeblew999/remy-showcase` (`packages/showcase`, its README), for the apps that show them. Tablets and desktops get the sidebar (collapsing to icons);
  phones get the bottom bar (`blocks/bottom-nav`, stock shadcn parts, since shadcn has no bottom navigation)
  with the core pages and More, which opens the sidebar. Why: [the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/mobile-navigation.md).

What every app on the package has, so the shared tasks and checks work in it (remy-auth-app is the
prerendered example):

- **Its frame settings, once, in `defineRemyApp`** (`app-config`): its name (the product's, [written once](./gui.md#the-products-name)), source, the site header's and
  the app sidebar's links (each written with TanStack's `linkOptions`, so it is checked against the app's
  own routes where it is written). The shared frame names no route but `/`, so an app with other pages
  than remy-auth's type-checks as it is.
- **Its root renders pages in `AppProviders`** (`providers`), with that config and the root loader's
  `preferred` language: reading direction, the theme (the header's toggle and the Settings page need it),
  the frame settings and the language to offer, which every frame reads, so no page passes it. The shared
  `themeChecks` fail without it.
- **A route for every path in `appPaths` and `sitePaths`**, each a few lines over the shared page (the
  showcase's Clock spreads `clockRouteOptions` from `@joeblew999/remy-showcase/clock-route`).
- **`tests/smoke.spec.ts`**, one `smokeChecks(...)` call: `project:test:smoke` and the check after every
  `cf:deploy` (`project:test:live`) run it, and fail with "No tests found" without it.
- **`.plans/now.md`**, the one ordered list of open work (`plans:check`, in tier 0).
- **Installs and upgrades through the shared tasks**, never by hand: `mise run project:setup` (install,
  skills, MCP, verify) and `mise run project:upgrade-ui <version>` (the exact package version and the
  tasks include at the same tag, then verify). Both take GitHub Packages' token from `gh auth token`.

## Exports

All under `@joeblew999/remy-ui/`, as TSX and CSS for Vite and Tailwind consumers.

| Export | What it holds |
| --- | --- |
| `tailwind.css` | The three stylesheets below in order, plus `@source` for the package's own classes: one import for an app |
| `globals.css`, `fonts.css`, `text.css` | shadcn's stylesheet as the CLI writes it; the fonts for every language; how text breaks in every language (hyphenation by `lang`, Japanese phrase breaks) |
| `components/*`, `hooks/*`, `button` | shadcn components and hooks (`button` is also a short path) |
| `paths` | `isAppPath`: whether a de-localized path is an app page |
| `shell` | The site frame: `SiteShell` (alias `Shell`), `Intro`, `ZoneBadge`, `SkipLink` |
| `app-shell` | The app frame alone: `AppShell` (the sidebar, the phone's bottom bar), for an app's own app pages. Its footer has the build stamp (`versions`) |
| `app-config` | `defineRemyApp` and its types (`RemyApp`, `NavItem`): the app's name, source and navigation for every frame; `useRemyApp`, `usePreferredLocale`. `brand` is [the product's name](./gui.md#the-products-name), the one place it is written: every message that says it takes it as `{product}`; `pageTitle(title, brand)` is a page's title as the browser tab shows it |
| `root` | `remyRoot(app, { devtools })`: the root route's options (the document in the page's language and direction, `AppProviders`, the language to offer, the problem pages); `RemyRouterContext`, `preferredLocale`. An app's `__root.tsx` is `createRootRouteWithContext<RemyRouterContext>()(remyRoot(remyApp, { devtools: <TanStackDevtools … /> }))`: the devtools stay in the app's file, where TanStack's Vite plugin strips them from production builds |
| `router` | `remyRouter(routeTree)`: the router every app makes (the locale rewrite, a QueryClient per request with Query's SSR integration, intent preloading, the CSP nonce) |
| `app/vite` | `remyApp({ plugins, start, cloudflare, port, build })`: an app's whole `vite.config.ts` (TanStack Devtools, the parts, the build stamp, Cloudflare, Fontaine, Tailwind, Start, React; the app's own catalog when it has `project.inlang`) |
| `providers` | `AppProviders`: what an app's root renders its pages in (direction, theme, the app's `defineRemyApp` config, the `preferred` language) |
| `language` | `LanguageSwitcher` (plain links, site pages), `LanguageMenu` (shadcn DropdownMenu, app pages), `LanguageHint` |
| `messages`, `runtime` | Compiled Paraglide messages and runtime |
| `locale` | Paraglide's `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName` and more, plus `direction`, `localeName` and `followLocale(runtime)` (a second catalog, the app's or a package's, in the platform's language) |
| `locale-info` | Calendars, digits, clock and week conventions from Intl Locale Info; `formatLocale` (the tag every formatter uses, naming the language's own calendar and digits), `weekOrder`, `words` (Intl.Segmenter) |
| `matching` | The `custom-chinese` Paraglide strategy (Traditional Chinese tags reach `zh-TW`), `matchChinese`, `preferredFromHeader`, `preferredFromNavigator` |
| `seo` | Canonical and `hreflang` alternates; `sitemapXml({ origin, paths, extra })` (the app's site pages in every locale, then the app's own entries), `robotsTxt(origin)`, `sitemapType`, `robotsType` for the app's two server routes |
| `prerender` | `prerenderPages({ notFoundPath, paths })`: a prerendered app's TanStack Start `prerender.pages` (every page un-localized and per locale, robots.txt, sitemap.xml, each locale's 404.html) |
| `tanstack` | `localizedWorker` (Worker entry: observability, Paraglide's middleware and entry redirects around TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` for prerendered apps |
| `worker` | `withObservability` and the request-ID helpers; its `/healthz` says which deployment answered (`build`'s `Deployment`) |
| `build`, `build/vite` | [Which version is deployed](./gui.md#which-version-is-deployed). `build/vite`: `remyBuild({ packages })`, the Vite plugin behind `virtual:remy-build` (in `remyApp()` and `remyDocs()` already), and `buildStamp()`. `build`: the Zod shapes `stamp` and `deployment` with their types `Build` and `Deployment`, `askDeployment(origin)`, `deploymentQuery(origin)` (TanStack Query options: asked in the browser, again every five minutes), `sameBuild`, `shortCommit` |
| `versions` | `BuildStamp` (one quiet line: the environment off production, the product's name, the commit, and a reload control when the deployment has moved on under the page) and `Versions` (this app, its docs Worker and the `deployments` the app lists in `defineRemyApp`, each answering for itself, and the packages of this build). Stock shadcn parts; put either anywhere inside `AppProviders` |
| `cloudflare` | `placeFromCloudflare` |
| `problem` | The localized problem pages: `Problem`, `NotFound`, `ErrorPage`, `problemPages` (one spread line per page route) |
| `parts`, `parts/vite`, `parts/checks` | Parts ([plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md)): an app lists them in `src/parts.json`, one per line: the platform's by name, another package's as `<package>/<name>`. `remyParts()` in `vite.config.ts` (its `plugin` among the plugins, its `routes` as `tanstackStart({ router: { virtualRouteConfig } })`) mounts each listed part's routes beside `src/routes` and generates `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` in the test file runs each listed part's checks. The platform's part is `seo-routes` (robots.txt and the sitemap); the showcase offers `time-zones`, `deferred-place` and `status-card` (`@joeblew999/remy-showcase/<name>`); see [Writing a part](#writing-a-part) |
| `rows`, `zod-csp` | `Group`, `Row`, `NameList`: label/value rows; Zod's jitless switch (AppProviders imports it) |
| `invalidate` | `invalidateEverything(router, queryClient)`: every loader and query stale and reloaded (after logout or a role change; the status card's refresh) |
| `samples` | The fixed values the pages render |
| `checks`, `problem.checks`, `build-boundaries.checks`, `code-splitting.checks` | Shared Playwright checks: public pages, entry URLs (with the Chinese strategy), text (`textChecks`: 320 px, hyphenation, casing by language), fonts (`fontChecks`: the font that draws each language is the one `fonts.css` names for its script), zones, observability, Lighthouse and Core Web Vitals, the problem pages, what the browser downloads (`buildBoundaryChecks`) and code splitting (`codeSplittingChecks`) |
| `app-checks` | One call per kind of app for the shared check set over the app's own pages: `serverAppChecks({ service, sitePaths, appPaths, home, oneLanguage, cspEnforced })` (server-rendered: redirecting entry URLs, CSP, fonts) and `prerenderedAppChecks({ service, sitePaths, appPaths, home })` (static entry pages), both with the build stamp and the product's name (`versions.checks`); the app adds only checks for what it adds. An app showing the showcase pages also calls `showcaseChecks({ product })` (`@joeblew999/remy-showcase/showcase.checks`; `product` is its `brand`); `problemChecks` is `problem.checks` |
| `playwright` | `playwrightConfig()`, the shared Playwright configuration |
| `api/server` | `apiHandlers` (oRPC's OpenAPIHandler as a Start server route's handlers, with the reference page at `/api/doc` and the generated document at `/api/openapi.json`; `errorStatuses`, the HTTP status of each of the API's own error codes, since oRPC keeps statuses out of the errors; `origins`, the registered apps' exact origins allowed by oRPC's CORSHandlerPlugin, none by default; an answer to a request with credentials, and every 401, is `no-store`), `generateSpec(router, info, errorStatuses)` (the OpenAPI 3.1 document), `ApiInfo`, `ErrorStatuses` |
| `api/guard` | The guard for the installed oRPC, which an app's router imports: `guard()` (the router's root middleware: `implement(contract).$context<...>().use(guard<User>())`), `GuardContext` (the context's `getSession()`: the caller's session or null, asked only when a policy needs it, as oRPC's Better Auth guide shares it; and `relations`, the app's relation engine, for procedures whose policy is an action), `once` (that lookup, run at most once per call), `signedIn(context)` (the person a `session` or action procedure runs for), `noSession` (the context of an app that signs nobody in); and everything in `api/guard-core` and `api/policy`. Plain JavaScript, because an app's checks load its router in Node |
| `api/guard-core` | The guard itself, with no oRPC import, so it runs on oRPC 1 and 2: `Policy` (`public`: anyone, and the answer names no person; `session`: a signed-in person, and the answer is their own; `{ action }`: a signed-in person holding a relation the app's vocabulary grants that action to, on the object the input's `id` names), `guardMiddleware({ ORPCError })` (enforces each procedure's `meta.policy`; for an action it asks the relation engine, answers 404 for a missing object before 403, and a procedure that declares no policy never runs), `guardProblems(router, { personFields, vocabulary })` (what is wrong, one sentence each: no policy, no guard in front, a public answer that names a person, a personal answer without `meta.personal` saying who receives it, an action the vocabulary does not define or whose input cannot name its object), `policyOf`, `actionOf`, `isGuarded`, `walk`, `personFields` |
| `api/policy` | What a contract procedure declares for the guard, as oRPC metadata: `policy('public' \| 'session')`, `personal('<who receives it>')`, and `actions(vocabulary)`, which gives `may('EDIT_NOTE')` for exactly the actions the app's vocabulary defines, as in `oc.meta(may('EDIT_NOTE'))` |
| `api/relations` | The relation engine: who may do what is answered by relations, from the app's own tables in its own D1. `defineVocabulary({ objectTypes, relations, actions, grants })` (the app's vocabulary as data, in remy-sport's row shapes: a relation is derived from a table row, through a parent, from a platform role, or held by everyone), `relationEngine(vocabulary, db)` (`can`, `canAll`, `canFor` for a whole list's permission maps, `holds`, `heldAmong`, `objectsHeldBy`, `usersHolding`, `audienceFor`, `objectExists`), `vocabularyProblems` and `schemaProblems` (the vocabulary against itself and against the schema its migrations build), and the types `Can`, `ActionCode`, `ActionOn` that carry an app's action names to its contract and its pages |
| `api/client` | `contractClient(contract, { origin })` (a typed client for any contract: OpenAPILink with ResponseValidationLinkPlugin, the page's language as Accept-Language; without `origin`, the page's own), `isomorphicClient` (an app's own client: the router on the server, `contractClient` in the browser, through `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems(router, { errorStatuses })` (every procedure has a route under `/api/`, a policy, an output and documented errors, each with a message and an HTTP status), `procedures`, `routeOf` (a procedure's `openapi()` metadata), `statusesOf` |
| `api/checks` | `apiChecks({ router, title, origins, errorStatuses, personFields, vocabulary })` (coverage, the served document and reference page, CORS for exactly the registered `origins`, and the guard: `guardProblems` is empty, and every procedure that needs a session answers a stranger 401, uncached) |
| `versions.checks`, `build.checks` | `buildChecks({ service })` (`/healthz` says the environment and the build; a local run's stamp is this checkout's commit), `buildStampChecks({ path })` (the frame's stamp, and the reload control only when the deployment answers with another build), `productNameChecks({ paths })` (every title ends with the app's name; an app of another name never shows "Remy"). The app-check sets run all three |
| `allowed`, `allowed.checks` | `<Allowed can={row.can} action="EDIT_NOTE">`: shows its children only when the server allowed that action for this viewer on this object (`can` is the map the server sent with the row; only an action the row carries type-checks), so a page never works out permissions itself. `offeredActions(locator)` and `allowedActions(can)` let an app's check compare what a page offers with what the server allows |
| `environment` | `environments({ production: {...}, local: {...} })`: an app's table of what each environment permits, one row per capability; `permits(env, 'capability')`, `policyFor`, `environmentOf`. The environment is declared (`ENVIRONMENT`), and anything absent or unknown is production |
| `mail` | `mailerFor({ capture, binding, from })`: mail through Cloudflare Email Service (the Worker's `send_email` binding), or kept in the Worker's outbox where the environment captures it (`readOutbox`, `clearOutbox`); a refusal says who the mail was for and why; a message to an address no mail can reach (`unreachable`: the reserved test and example domains) is never sent |

The package's dependencies are the platform's one dependency set, pinned exactly: the framework (React,
TanStack Start, Router and Query), the toolchain (Vite, Wrangler, Tailwind, TypeScript) and the tools the
shared tasks and checks run (Playwright, Lighthouse, the DevTools MCP server, npm-check-updates). An app
names only the package; `remy.singleCopy` in its `package.json` lists those that break when installed twice,
which `project:single-copies` checks ([tasks](./tasks.md#choosing-the-version-released-development-or-local)).

## Language

Language behaviour is Paraglide's: strategies `url`, `cookie`, `custom-chinese` (Paraglide's own custom-strategy hook, in `matching.js`), `preferredLanguage`, `baseLocale`,
every locale prefixed in the URL, configured once in `paraglide.mjs`, which compiles
`messages/*.json` during type generation and the Vite build. Pass `{ locale }` explicitly to every
message call; there is no process-wide locale. A server-rendered app runs the middleware and passes
the visitor's preference down; a prerendered app resolves it in the browser after hydration; both
render the same components. The languages are the `locales` in `project.inlang/settings.json`;
every catalog except English and Spanish (Arabic, Persian, Hebrew, Thai, Japanese, Traditional
Chinese, Hindi, Amharic, Polish, Turkish and German) is agent-authored and unreviewed.

## Publishing

The package is `@joeblew999/remy-ui` on GitHub Packages (the scope must equal the
GitHub owner there). `mise run ui:release` does the whole release from this machine, stopping at the
first failure: translations complete and current (`i18n:check`, strict), every check of ours
(`project:verify`), shadcn's files exactly as its CLI writes them (`ui:verify`), Google's Lighthouse audits,
and Core Web Vitals measured cold on a throwaway Cloudflare Worker (`project:test:cwv`: the first visits
after a deploy, which is what a slow page costs most). Then it tags `vX.Y.Z` from
`packages/ui/package.json`, pushes, publishes with your `gh` token and creates the GitHub release from the
matching CHANGELOG section. CI (`.github/workflows/google.yml`) repeats level 2 on the tag.

Before releasing, one commit: the version in `packages/ui/package.json` (and in
`packages/contract/package.json` when the contract changed) and the CHANGELOG section. No other file
names a version: the workspaces depend on each other with `"*"` and the contract's peer range is
open-ended. The task refuses a dirty tree, a branch other than main, or an existing tag.

Consumers add to their `.npmrc`:

```
@joeblew999:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

and install through `mise run project:setup`, which takes a `read:packages` token from `gh auth token`
(or `GITHUB_TOKEN` in the shell). Released versions are in the
[changelog](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).

## Writing a part

A part is a feature an app switches on or off with one line in its `src/parts.json`. The platform's parts are
listed by name (`"seo-routes"`); any package can offer parts too, listed as `"<package>/<name>"`
(`"@joeblew999/remy-showcase/time-zones"`), and they work the same way.

1. **Folder:** `src/parts/<name>/` in the package, with any of:
   - `routes/`: TanStack route files, mounted beside the app's own `src/routes` when the part is listed;
   - entry modules (e.g. `ui.tsx`, `place.ts`) the app imports as `virtual:remy-parts/<name>/<entry>`:
     the real exports when listed, `undefined` when not, so the app writes `{Card && <Card />}` or
     `getPlace?.()` and nothing ships when the part is off. One module per entry keeps code splitting;
   - `checks.js`, whose default export `(options, listed) => void` runs its Playwright checks: `partChecks()` runs
     it only when the part is listed, with the app's `options[<name>]`.
2. **Catalog:** the platform's are `catalog` in `src/parts/list.js`; another package's are its
   `src/parts/catalog.json`, exported as `<package>/parts/catalog.json`, in the same shape: `routes`, `requires` (parts that must be
   listed too), `entries` (entry → export names), `app` (options the app supplies from its own
   `src/parts/<name>.ts`, read as `virtual:remy-parts/<name>/app`) and `sitePaths` (site pages it adds,
   for the sitemap and its checks).
3. **Types:** declare its virtual modules in the package's `src/parts/virtual.d.ts` (another package's references
   the platform's with `/// <reference types="@joeblew999/remy-ui/parts/virtual" />`). A part links only to
   its own routes, or to the app's pages through its `app` options (the time-zones part's breadcrumb takes
   `parent`), never to a page another app may not have: the consumer fixture lists a showcase part and
   type-checks it without the showcase's pages.
4. **Prove it:** `mise run project:check` passes with the part listed, with it removed, and with the list
   empty (run a build once after editing `src/parts.json`, which regenerates the route tree).

What stays a plain package module instead: code every app needs (observability), a hook an app must
always call (leave-guard), or a shared page's own controls (search-params).

