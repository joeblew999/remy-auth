# @joeblew999/remy-showcase

remy-auth's showcase pages on the Remy platform, for the apps that show them (remy-auth, and remy-auth-app as
the prerendered example). The platform, `@joeblew999/remy-ui`, knows nothing of this package: it imports the
platform only through the platform's exports, and nothing in the platform imports it
([platform structure, fix 2](https://github.com/joeblew999/remy-auth/blob/main/.plans/platform-structure.md)).

| Export | What it holds |
| --- | --- |
| `pages` | `HomePage`, `HomeCard`, `FormatsContent`, `FormatsPage`, and the showcase's `sitePaths`, `appPaths`, `allPaths` |
| `app-pages` | `AppHomePage`, `AppFormatsPage`, `LocationPage`, `DemoPage`, `ClockPage`, `SettingsPage`, `AccountPage` |
| `app-nav` | `showcaseSiteNav`, `showcaseAppNav`: the showcase's navigation, for `defineRemyApp`'s `site.nav` and `app.nav` |
| `paths` | The showcase's pages: `sitePaths`, `appPaths`, `allPaths` |
| `clock-route` | `clockRouteOptions`, `clockDefaults`, `clockZones`: the Clock route's search params |
| `reservation` | The demo reservation's Zod schema (seats typed in any script's digits), `asciiDigits` |
| `search-params`, `navigation-blocking` | The formats page's search params and `choiceCards`; the demo's leave guard |
| `showcase.checks` | `showcaseChecks({ rendering, formats, devicePath, network })`: every showcase check, which an app showing the showcase calls itself |
| `reservation.checks` | `reservationApiChecks`: the demo reservation's typed 400 in every locale, and a response that breaks the contract refused in the browser |
| `tailwind.css` | Where the showcase's classes live: import it beside `@joeblew999/remy-ui/tailwind.css` |

Its strings are still in the platform's catalog (`@joeblew999/remy-ui/messages`); they move to a catalog of
the showcase's own in the plan's next stage. The time-zones, deferred-place and status-card parts are still
the platform's too: they are listed in `src/parts.json` like any part, and move here once the parts catalog
takes parts from another package.

Published with the platform's release (`packages:publish` publishes each workspace that is not private).
remy-auth's API contract imports its reservation schema from here.
