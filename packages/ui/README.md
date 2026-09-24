# Remy UI proof

One local workspace package, used through public exports by the public page and
client-rendered demo. Every file in `src/components` is what the pinned shadcn CLI
generates from the official registry for the `base-nova` style on Base UI, including
`cn` from shadcn's own `cn` package; nothing there is hand-edited. `mise run ui:components`
regenerates them all (add a component by extending that task's list); the regeneration
is committed, so review sees any drift.
The stone/orange theme tokens in `src/styles.css` are shadcn's token format with Remy's
values.

Exports: `button`, `styles.css` (theme tokens and the language components' styles),
`messages`, `runtime` (the generated Paraglide runtime as plain JavaScript), `locale`
(Paraglide's `getLocale`, `setLocale`, `localizeHref`, `localizeUrl`, `deLocalizeHref`,
`cookieName` and text `direction`, plus `localeName`), `locale-info` (calendars, digits,
clock and week conventions), `seo` (canonical and hreflang data from the URL patterns),
`language` (switcher and hint), `react-router` (Paraglide's middleware as root middleware,
`suggestedLocale`, `redirectToLocalized`, `pageMeta`; `react-router` is an optional peer),
`client` (`useSuggestedLocale`, `DeviceTime` for prerendered apps), `cloudflare`
(`placeFromCloudflare`), `samples` (the fixed values the formats and demo pages render) and
`checks` (shared Playwright checks: public pages, entry URLs, demo, formats, Lighthouse and
Core Web Vitals; `@playwright/test` and `lighthouse` are optional peers) `playwright` (`playwrightConfig()`, the shared
Playwright configuration), `pages` (the shell and the home, demo and formats pages the checks
test) and `paths` (`publicPaths`), all under `@joeblew999/remy-ui/`.

Language behaviour is Paraglide's: strategies `url`, `cookie`, `preferredLanguage`,
`baseLocale` with every locale prefixed in the URL, configured once in `paraglide.mjs`.
A server-rendered app runs the middleware and passes the visitor's preference down; a
prerendered app resolves it in the browser after hydration; both render the same
components, so consumers get the whole behaviour in either mode.

Paraglide compiles `messages/*.json` during type generation and the Vite build.
Pass `{ locale }` explicitly to every message call. This proof has no process-wide
locale setter, browser-global locale detection or dependency on Remy Sport's API.
English, Spanish and Arabic catalogs are implemented; Arabic is agent-authored and
unreviewed. Formatting lives in the catalogs' `number`, `datetime`, `relativetime`
and `plural` declarations. The 27-locale inventory and release/provenance
integration remain in the GUI plan.

## Publishing

The package is `@joeblew999/remy-ui` on GitHub Packages (the scope must equal the
GitHub owner there). `mise run ui:release` does the whole release from this machine: it
runs `project:verify` (every check, locally), publishes with your `gh` token, tags
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

and install with a token that has `read:packages`. Version 0.1.0 is published;
[remy-auth-app](https://github.com/joeblew999/remy-auth-app) consumes it and proves a
client build and a server render from the tarball with `mise run package:verify`.
