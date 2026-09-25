# @joeblew999/remy-ui

The UI every Remy app shares: stock shadcn components and theme, fonts, Paraglide catalogs and
locale helpers, the site and app pages, TanStack Start glue, and the Playwright checks that prove
them. Consumers are remy-auth (server-rendered) and
[remy-auth-app](https://github.com/joeblew999/remy-auth-app) (prerendered); both run the same checks.

## shadcn, stock

Everything in `src/components`, `src/hooks` and `src/styles/globals.css` is what the pinned shadcn
CLI writes (monorepo layout: the app's `components.json` routes `shadcn add` here), including `cn`
from shadcn's own `cn` package; nothing there is edited by hand. `mise run ui:components` and
`mise run ui:theme` regenerate them and `mise run ui:verify` fails on any drift (see
[docs/gui.md](../../docs/gui.md#shadcn-stock)). Blocks are owned copies in `src/blocks`.

## Usage

Import the stylesheets in this order in the app's CSS (here `src/styles.css`), then tell Tailwind
where classes live:

```css
@import "@joeblew999/remy-ui/globals.css";
@import "@joeblew999/remy-ui/fonts.css";
@source "../src";
@source "../node_modules/@joeblew999/remy-ui/src";
```

`fonts.css` names fontaine's fallback faces; add `FontaineTransform.vite({ fallbacks: { 'Geist
Variable': ['Arial'] } })` before Tailwind in the Vite config (remy-auth's
[`vite.config.ts`](../../vite.config.ts) is the example).

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
| `globals.css`, `fonts.css` | shadcn's stylesheet as the CLI writes it; the fonts for every language |
| `components/*`, `hooks/*`, `button` | shadcn components and hooks (`button` is also a short path) |
| `paths` | `sitePaths`, `appPaths`, `allPaths`, `isAppPath` |
| `pages` | `SiteShell` (alias `Shell`), `HomePage`, `FormatsContent`, `FormatsPage`, `Intro`, `ZoneBadge`, `SkipLink`, `Group`, `Row` |
| `app-pages` | `AppShell`, `AppHomePage`, `AppFormatsPage`, `LocationPage`, `DemoPage` |
| `language` | `LanguageSwitcher` (plain links, site pages), `LanguageMenu` (shadcn DropdownMenu, app pages), `LanguageHint` |
| `messages`, `runtime` | Compiled Paraglide messages and runtime |
| `locale` | Paraglide's `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`, `cookieName` and more, plus `direction` and `localeName` |
| `locale-info` | Calendars, digits, clock and week conventions |
| `seo` | Canonical and `hreflang` alternates |
| `tanstack` | `localizedWorker` (Worker entry: observability, Paraglide's middleware and entry redirects around TanStack Start), `localeRewrite`, `pageHead`, `suggestedLocale`, `suggestedLocaleInBrowser` |
| `client` | `useSuggestedLocale`, `DeviceTime` for prerendered apps |
| `worker` | `withObservability` and the request-ID helpers |
| `cloudflare` | `placeFromCloudflare` |
| `showcase/*` | TanStack showcase pieces: search params and `choiceCards`, device place, leave guard, time zones |
| `samples` | The fixed values the pages render |
| `checks`, `showcase/*.checks` | Shared Playwright checks: public pages, entry URLs, demo, formats, zones, observability, Lighthouse and Core Web Vitals, and one per showcase piece |
| `playwright` | `playwrightConfig()`, the shared Playwright configuration |
| `api/server` | `apiHandlers` (oRPC's OpenAPIHandler as a Start server route's handlers, with the reference page at `/api/doc` and the generated document at `/api/openapi.json`), `generateSpec`, `specOptions` |
| `api/client` | `contractClient` (a typed client for any contract: OpenAPILink with ResponseValidationPlugin, the page's language as Accept-Language), `isomorphicClient` (an app's own client: the router on the server, `contractClient` in the browser, through `createIsomorphicFn`) |
| `api/coverage` | `coverageProblems` (every procedure has a route under `/api/`, a policy, an output and documented errors), `procedures`, `ApiMeta` |
| `api/checks` | `apiChecks` (coverage, the served document and reference page), `reservationApiChecks` (the demo reservation's typed 400 in every locale, and a response that breaks the contract refused in the browser) |

`@tanstack/react-router`, `@tanstack/react-start`, `@playwright/test` and `lighthouse` are optional
peers: the pages need the router, `api/client` needs Start, the checks need the other two.

## Language

Language behaviour is Paraglide's: strategies `url`, `cookie`, `preferredLanguage`, `baseLocale`,
every locale prefixed in the URL, configured once in `paraglide.mjs`, which compiles
`messages/*.json` during type generation and the Vite build. Pass `{ locale }` explicitly to every
message call; there is no process-wide locale. A server-rendered app runs the middleware and passes
the visitor's preference down; a prerendered app resolves it in the browser after hydration; both
render the same components. English, Spanish and Arabic are implemented; Arabic is agent-authored
and unreviewed.

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
[changelog](../../CHANGELOG.md).
