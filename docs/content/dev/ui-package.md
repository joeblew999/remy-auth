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

Every page is one of two kinds, listed in `paths` and never mixed:

- **Site pages** (`sitePaths`) come from `pages`, framed by `SiteShell`: complete without
  JavaScript, indexed, in the sitemap, judged by Lighthouse and Core Web Vitals.
- **App pages** (`appPaths`, under `/app`) come from `app-pages`, framed by `AppShell` (shadcn's
  sidebar-16 block): they need JavaScript and `pageHead` marks them `noindex`. They have their own
  export so a site page never downloads the app shell.

## Exports

All under `@joeblew999/remy-ui/`, as TSX and CSS for Vite and Tailwind consumers.

| Export | What it holds |
| --- | --- |
| `tailwind.css` | The three stylesheets below in order, plus `@source` for the package's own classes: one import for an app |
| `globals.css`, `fonts.css`, `text.css` | shadcn's stylesheet as the CLI writes it; the fonts for every language; how text breaks in every language (hyphenation by `lang`, Japanese phrase breaks) |
| `components/*`, `hooks/*`, `button` | shadcn components and hooks (`button` is also a short path) |
| `paths` | `sitePaths`, `appPaths`, `allPaths`, `isAppPath` |
| `pages` | `SiteShell` (alias `Shell`), `HomePage`, `FormatsContent`, `FormatsPage`, `Intro`, `ZoneBadge`, `SkipLink`, `Group`, `Row` |
| `shell` | The site frame alone: `SiteShell` (alias `Shell`), `SiteNavLinks`, `Intro`, `ZoneBadge`, `SkipLink` (also exported by `pages`); import it where a page needs only the frame, so the home and formats pages stay out of that page's download |
| `app-pages` | `AppShell`, `AppHomePage`, `AppFormatsPage`, `LocationPage`, `DemoPage` |
| `language` | `LanguageSwitcher` (plain links, site pages), `LanguageMenu` (shadcn DropdownMenu, app pages), `LanguageHint` |
| `messages`, `runtime` | Compiled Paraglide messages and runtime |
| `locale` | Paraglide's `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName` and more, plus `direction` and `localeName` |
| `locale-info` | Calendars, digits, clock and week conventions from Intl Locale Info; `formatLocale` (the tag every formatter uses, naming the language's own calendar and digits), `weekOrder`, `words` (Intl.Segmenter) |
| `matching` | The `custom-chinese` Paraglide strategy (Traditional Chinese tags reach `zh-TW`), `matchChinese`, `preferredFromHeader`, `preferredFromNavigator` |
| `reservation` | The demo reservation's Zod schema (seats typed in any script's digits), `asciiDigits` |
| `seo` | Canonical and `hreflang` alternates; `sitemapXml({ origin, extra })` (every site page in every locale, then the app's own entries), `robotsTxt(origin)`, `sitemapType`, `robotsType` for the app's two server routes |
| `prerender` | `prerenderPages({ notFoundPath })`: a prerendered app's TanStack Start `prerender.pages` (every page un-localized and per locale, robots.txt, sitemap.xml, each locale's 404.html) |
| `tanstack` | `localizedWorker` (Worker entry: observability, Paraglide's middleware and entry redirects around TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` for prerendered apps |
| `worker` | `withObservability` and the request-ID helpers |
| `cloudflare` | `placeFromCloudflare` |
| `problem` | The localized problem pages: `Problem`, `NotFound`, `ErrorPage`, `problemPages` (one spread line per page route) |
| `preferred` | `usePreferred`, the root loader's `preferred` language, for page routes (the app's root loader returns it) |
| `parts`, `parts/vite`, `parts/checks` | Parts ([plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/parts.md)): an app lists them in `src/parts.json`, one name per line. `remyParts()` in `vite.config.ts` (its `plugin` among the plugins, its `routes` as `tanstackStart({ router: { virtualRouteConfig } })`) mounts each listed part's routes beside `src/routes` and generates `virtual:remy-parts` (`parts`, `hasPart`); `partChecks()` in the test file runs each listed part's checks. Parts today: `time-zones`, `deferred-place`, `seo-routes`, `status-card`; see [Writing a part](#writing-a-part) |
| `showcase/*` | TanStack showcase pieces: search params and `choiceCards`, device place, leave guard, time zones, the live status card (`StatusCard`: the app passes the query, its own client's or a `contractClient` on another app's origin) |
| `invalidate` | `invalidateEverything(router, queryClient)`: every loader and query stale and reloaded (after logout or a role change; the status card's refresh) |
| `samples` | The fixed values the pages render |
| `checks`, `showcase/*.checks` | Shared Playwright checks: public pages, entry URLs (with the Chinese strategy), demo (native digits), formats (own calendar and digits, week rules, word segmentation), text (`textChecks`: 320 px, hyphenation, casing by language), fonts (`fontChecks`: the font that draws each language is the one `fonts.css` names for its script), zones, observability, Lighthouse and Core Web Vitals, and one per showcase piece; zones, observability, the Content Security Policy, Lighthouse and Core Web Vitals, and one per showcase |
| `app-checks` | One call per kind of app for the shared check set: `serverAppChecks({ service, ownSitePaths, oneLanguage, formats })` (server-rendered: redirecting entry URLs, CSP, fonts) and `prerenderedAppChecks({ service })` (static entry pages, showcase rows without server functions); the app adds only checks for what it adds |
| `playwright` | `playwrightConfig()`, the shared Playwright configuration |
| `api/server` | `apiHandlers` (oRPC's OpenAPIHandler as a Start server route's handlers, with the reference page at `/api/doc` and the generated document at `/api/openapi.json`; `origins`, the registered apps' exact origins allowed by oRPC's CORSPlugin, none by default), `generateSpec`, `specOptions` |
| `api/client` | `contractClient` (a typed client for any contract: OpenAPILink with ResponseValidationPlugin, the page's language as Accept-Language), `isomorphicClient` (an app's own client: the router on the server, `contractClient` in the browser, through `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems` (every procedure has a route under `/api/`, a policy, an output and documented errors), `procedures`, `ApiMeta` |
| `api/checks` | `apiChecks` (coverage, the served document and reference page, CORS for exactly the registered `origins`), `reservationApiChecks` (the demo reservation's typed 400 in every locale, and a response that breaks the contract refused in the browser) |

`@tanstack/react-router`, `@tanstack/react-start`, `@tanstack/react-query`, `@playwright/test` and
`lighthouse` are optional peers: the pages need the router, `api/client` needs Start, the status
card and `invalidate` need Query, the checks need the other two.

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
GitHub owner there). `mise run ui:release` does the whole release from this machine: it
runs `project:verify` (every check, locally) and `ui:verify` (shadcn files unchanged), publishes with your `gh` token, tags
`vX.Y.Z` from `packages/ui/package.json`, pushes, and creates the GitHub release from the
matching CHANGELOG section, gated only on level 1 (our own checks, about 1½ minutes).
CI (`.github/workflows/google.yml`) runs level 2, Google's Lighthouse audits and Core
Web Vitals, on every push and tag, and releases a pushed tag itself unless the version is
already published, so either route works. Bump the version and CHANGELOG
first; the task refuses a dirty tree, a branch other than main, or an existing tag.

Consumers add to their `.npmrc`:

```
@joeblew999:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

and install with a token that has `read:packages`. Released versions are in the
[changelog](https://github.com/joeblew999/remy-auth/blob/main/CHANGELOG.md).

## Writing a part

A part is a feature an app switches on or off with one line in its `src/parts.json`.

1. **Folder:** `src/parts/<name>/` in this package, with any of:
   - `routes/`: TanStack route files, mounted beside the app's own `src/routes` when the part is listed;
   - entry modules (e.g. `ui.tsx`, `place.ts`) the app imports as `virtual:remy-parts/<name>/<entry>`:
     the real exports when listed, `undefined` when not, so the app writes `{Card && <Card />}` or
     `getPlace?.()` and nothing ships when the part is off. One module per entry keeps code splitting;
   - `checks.js`: its Playwright checks, run by `partChecks()` only when listed.
2. **Catalog:** add it to `catalog` in `src/parts/list.js`: `routes`, `requires` (parts that must be
   listed too), `entries` (entry → export names), `app` (options the app supplies from its own
   `src/parts/<name>.ts`, read as `virtual:remy-parts/<name>/app`) and `sitePaths` (site pages it adds,
   for the sitemap and its checks).
3. **Types:** declare its virtual modules in `src/parts/virtual.d.ts`.
4. **Prove it:** `mise run project:check` passes with the part listed, with it removed, and with the list
   empty (run a build once after editing `src/parts.json`, which regenerates the route tree).

What stays a plain package module instead: code every app needs (observability), a hook an app must
always call (leave-guard), or a shared page's own controls (search-params).

