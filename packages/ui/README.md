# Remy UI proof

One local workspace package, used through public exports by the public page and
client-rendered demo. The shadcn `base-nova` / Base UI button and stone/orange CSS
variables come from the existing Remy Sport source. Keep upstream attribution and
use shadcn tooling for component upgrades rather than independently editing copies.

Exports: `@remy/ui/button`, `@remy/ui/styles.css`, `@remy/ui/messages`,
`@remy/ui/locale` (locale list, `direction` and `localeName` from Intl). React is a peer dependency. Consumers need a TSX-aware build and
Tailwind 4 configured to scan the component source. Import the CSS after Tailwind.

Paraglide compiles `messages/*.json` during type generation and the Vite build.
Pass `{ locale }` explicitly to every message call. This proof has no process-wide
locale setter, browser-global locale detection or dependency on Remy Sport's API.
English, Spanish and Arabic catalogs are implemented; Arabic is agent-authored and
unreviewed. Formatting lives in the catalogs' `number`, `datetime`, `relativetime`
and `plural` declarations. The 27-locale inventory and release/provenance
integration remain in the GUI plan.

The package is private while its public contract is being proven. Its current
source exports can be tested using `mise run ui:pack`; publishing and migration
of existing Remy apps are later work.
