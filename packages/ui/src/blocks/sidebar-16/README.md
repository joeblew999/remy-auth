# sidebar-16

shadcn's `@shadcn/sidebar-16` block ("A sidebar with a sticky site header"), added with
`shadcn add @shadcn/sidebar-16` and owned here, as shadcn intends for blocks. Its structure is
kept; only its sample data is replaced with Remy's: the brand, the app pages, the language menu
(`LanguageMenu`) and the way back to the site in the footer. Every Remy app shares it through `AppShell` in [`../../app-pages.tsx`](../../app-pages.tsx), the
frame of every app page; site pages use `SiteShell` in `../../pages.tsx` instead.

Its files sit in `components/`, exactly where shadcn writes them when run from the package: the
package's `components.json` points the `components` alias at `@joeblew999/remy-ui/blocks`.
`mise run ui:blocks` shows upstream's changes to each file in place (`shadcn add --diff`); merge
them by hand. Never re-add with `--overwrite`: the block's sample data would replace Remy's, and the
block's unused files (nav-projects, nav-secondary, nav-user, search-form) would appear.
