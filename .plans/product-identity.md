# What is deployed, and whose name it carries

Status: built on branch `product-identity` on 2026-10-09, waiting for the owner to say ship.

Two requests from the owner on 2026-10-09, while slices 2 and 3 of [the auth plan](auth-service.md)
went live:

1. "There is another global thing in the Remy-sport repo you should adopt ... it shows the version of
   everything deployed. It does a few other things around it too perhaps. You can decide the best place
   for it in Remy-auth and the shared backend and front end shared code. A shadcn component is best so
   that it's easy to put it anywhere on a consuming app."
2. "We will also need to fully control the name 'Remy'. It's our prototype name but when it's used for
   real production projects it will be different per project using this code. So you work out the best
   way and show it off in Remy's own demo."

Both are about what a deployment says it is. How they work, for developers and agents of every Remy
repo: [the GUI page](../docs/content/dev/gui.md#which-version-is-deployed).

## What was built

**Which version is deployed**

- **A build stamp**, worked out once per build from the sources (`remyBuild()`, in `remyApp()` and
  `remyDocs()`, so an app writes nothing): the app's package, the commit, a hash of what was
  uncommitted, and the installed version of each platform package.
- **Every Worker answers with it** at `/healthz`, beside its environment, Cloudflare's version ID and
  when Cloudflare was given that version. Any origin may read it; it names nobody.
- **`BuildStamp`**, a line in the app frame's footer on every app page of every app: the environment
  unless it is production, the product's name, the commit (linked to the source), and a reload control
  when the deployment answers with another build than the page's: a tab left open across a deploy.
- **`Versions`**, a section an app places where it likes: this app, its docs Worker and any other
  deployment it lists, each answering for itself, and the packages this build was made with.
  remy-auth's Settings page shows it.
- **`mise run cf:versions`**: a row per deployment, each commit placed against this checkout
  ("3 behind HEAD"). Asked, never remembered.

**The product's name**

- **One value**, the app's `brand` (`defineRemyApp`), written once: for an app with docs, as
  `product` in `docs/docs.config.ts`, which the template already did and remy-auth now does too.
- **Every message that says the name takes it** as `{product}` (13 messages), so the compiler refuses
  a caller that leaves it out. The frame, page titles, the home page's structured data, the sign-in
  email and Better Auth's `appName` take the same value.
- **The demo shows it**: the Settings page's "Product name" card lists where the name is used, and
  typing another name runs the same messages with it, on that page only.

## What ran

| Claim | How it ran |
| --- | --- |
| `/healthz` says the environment and the build, and on a local run the stamp is this checkout's commit (a stamp left from an earlier build fails) | Check: `buildChecks`, in every app's shared set and the docs Worker's |
| The app frame shows the page's build and the environment off production, and offers the reload only when the deployment answers with another build | Check: `buildStampChecks`, in every app's shared set (the other build is a rewritten `/healthz` answer) |
| The Settings page lists this deployment with what `/healthz` says, and the packages of the build | Check: `settingsChecks`, in the showcase's set |
| Every page's title ends with the app's name, and an app of another name never shows "Remy" | Check: `productNameChecks`, in every app's shared set. remy-auth is called Remy, so the second half bites in the consumer fixture, which is called "My app" |
| No message in the platform's catalog names a product | Check: `tests/product.spec.ts` |
| The sign-in email is in the name of whichever product sends it | Check: the same file |
| The Settings page's samples are the real messages, with the app's name and with a typed one | Check: `settingsChecks` |
| `cf:versions` against the live Workers and a local one | By hand: the live ones answered "deployed before the build stamp" (they are), the local one `e0da503+changes, = HEAD` |
| The Settings page on a desktop and a phone | By hand: `browser:shots` |

## Not run: assumed

- **The translations** of the 13 changed and 18 new messages: other languages still say "Remy" in
  those 13 until `i18n:translate` runs on main, whose check fails a translation that loses `{product}`.
  That is why `productNameChecks` reads the English pages.
- **A deployment with the stamp.** Both live Workers predate it. Until they are deployed again,
  `cf:versions` says so, and a page asking the docs Worker shows "No answer" (its `/healthz` does not
  yet allow another origin to read it).
- **An app whose Vite configuration is not `remyApp()`** would not build (`virtual:remy-build` has no
  plugin behind it). Every app known uses it.
- **An app built outside a git checkout** names no commit; the frame then shows the name alone.

## What remy-sport has in this area, and where each went

| In remy-sport | Here |
| --- | --- |
| A build stamp with one definition and two readers (the page and the Worker) | Taken: `remyBuild()` and `virtual:remy-build` |
| The commit, the app's version, a link to the commit | Taken. The link is made by the page, from the app's `repository` |
| The build time and the branch in the stamp | Not taken: with a time in it, every build changes the bundle that carries it. When a version went live is Cloudflare's to say (`deployedAt`); the branch says nothing the commit does not |
| `/api/versions`, public, answering "unknown" rather than failing | Taken, as `/healthz`: every Worker on the package has it already, and the deploy reads it |
| `/api/health` says the environment, so nothing guesses it from a hostname | Taken: `/healthz` |
| The stamp in the sidebar: the environment off production, the commit, an update control when the page is stale | Taken: `BuildStamp`, in the app frame's footer |
| Staleness from the page's script name against the served page's, and from the service worker | Adapted: the page's stamp against the deployment's answer. It needs no service worker, and the stamp cannot go stale because every deploy builds |
| Reloading by itself on a developer's machine | Not taken: Vite's dev server already reloads, and a built preview is not edited under its reader |
| `ops versions`: what each environment runs and how far that is from HEAD | Taken: `cf:versions` |
| Flagging an environment that reports another's name | Not taken: one environment per deployment here. It is a column when there is a staging |
| The deploy waits until the edge serves what it published | Already so: `cf:wait`, by Cloudflare's version ID |
| The API document's version from the package | Already so: the contract's `info` |
| The Worker never reads a compile-time value (its test pool builds without Vite) | Not needed: every Worker here is built by Vite and checked as built |

## Decisions (delegated)

1. **`/healthz` answers it**, not a new route and not each app's contract. Every Worker on the package
   has the route (apps, the docs, prerendered apps), so the component needs no wiring in an app.
   remy-auth's contract `status` is unchanged; it can carry the stamp when a typed remote caller needs it.
2. **The stamp comes from the sources alone.** The same checkout builds the same stamp.
3. **A page is stale when its deployment answers with another build**: another commit, or the same
   commit with other uncommitted changes. It offers the reload and never reloads by itself.
4. **The stamp is in the app frame for every app; `Versions` is the app's to place.** Site pages, which
   are public and indexed, do not show a commit.
5. **Anyone may read `/healthz`.** It names nobody, and one deployment's page can then list another's.
6. **The product's name is the app's `brand`**, written once. Platform identifiers are not the
   product's name and stay: the packages (`@joeblew999/remy-ui`), the `remy` skill, task names, a
   Worker's service name, the MCP servers' names.
7. **Three messages nothing used were removed** (`ask_description`, `ask_intro`, `search_description`),
   rather than given a name to take.
8. **The account page's description says sign-in exists** (`account_sign_in_description`); it said it
   was still to come.

## Not built

- The docs Worker's own pages show no stamp (their frame is Fumadocs'); an app's `Versions` lists it.
- A sender name on the sign-in email ("Remy" before the address): one field on the mailer.
- A name per request (one deployment under several names).

## For apps upgrading

`showcaseChecks` needs `product` (the app's `brand`); a message that says the name needs `{ product }`,
which the compiler points at; `pageHead`'s `title` and `description` receive it as a second argument.
