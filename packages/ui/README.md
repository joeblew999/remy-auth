# Remy UI proof

One local workspace package, used through public exports by the public page and
client-rendered demo. The shadcn `base-nova` / Base UI button and stone/orange CSS
variables come from the existing Remy Sport source. Keep upstream attribution and
use shadcn tooling for component upgrades rather than independently editing copies.

Exports: `@joeblew999/remy-ui/button`, `@joeblew999/remy-ui/styles.css`, `@joeblew999/remy-ui/messages`,
`@joeblew999/remy-ui/locale` (locale list, `direction` and `localeName` from Intl). React is a peer dependency. Consumers need a TSX-aware build and
Tailwind 4 configured to scan the component source. Import the CSS after Tailwind.

Paraglide compiles `messages/*.json` during type generation and the Vite build.
Pass `{ locale }` explicitly to every message call. This proof has no process-wide
locale setter, browser-global locale detection or dependency on Remy Sport's API.
English, Spanish and Arabic catalogs are implemented; Arabic is agent-authored and
unreviewed. Formatting lives in the catalogs' `number`, `datetime`, `relativetime`
and `plural` declarations. The 27-locale inventory and release/provenance
integration remain in the GUI plan.

## Publishing

The package is `@joeblew999/remy-ui` on GitHub Packages (the scope must equal the
GitHub owner there). Both repositories have been public since 2026-09-24; GitHub sets
the package's visibility from the linked repository (public since 0.1.0), and its npm
registry returns 401 without a token even for public packages, confirmed 2026-09-24. `.github/workflows/publish.yml`
publishes it when a `vX.Y.Z` tag is pushed whose version equals `packages/ui/package.json`,
using the workflow's own `GITHUB_TOKEN`; no long-lived npm token exists. Cut releases
with the installed `github-release` skill (SemVer from the public diff, changelog,
release PR, then the tag). `mise run ui:pack` still produces the tarball locally.

Consumers add to their `.npmrc`:

```
@joeblew999:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

and install with a token that has `read:packages`. Version 0.1.0 is published;
[remy-auth-app](https://github.com/joeblew999/remy-auth-app) consumes it and proves a
client build and a server render from the tarball with `mise run package:verify`.
