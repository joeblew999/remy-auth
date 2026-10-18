---
title: "Run, preview and test the app"
description: "One Cloudflare Worker serves the site and the app; how to run it locally, preview it and test it against local and remote targets."
---

:::note
The browser checks use Playwright's own Chromium (the `browsers` task installs it). Everything runs locally in the Workers runtime, on Wrangler's
local D1; no Cloudflare account, remote database or production credentials are needed. Browser
tests own `PREVIEW_PORT` (default 4173; each agent sets its own) and refuse to reuse an unrelated
process. Stop a manual preview before a browser check; the development server on 5173 can remain running.
The checks' Chromium is Playwright's (the `browsers` task: `playwright install chromium`); on Linux the Han languages
also need a CJK font: `sudo apt-get install -y --no-install-recommends fonts-noto-cjk`, as GitHub's browser jobs run it.
:::

## One scaffold for local and Cloudflare

`wrangler.jsonc` is the source of truth for the Worker entry, compatibility flags,
bindings and observability. Vite generates `dist/server/wrangler.json` and
`.wrangler/deploy/config.json`; do not hand-edit or commit either generated file.
Both local preview and Wrangler deployment consume the generated production build.
Development uses the same Worker source and Cloudflare runtime with hot reload.

Every command for the app, its checks and its deployments, with what each does: [Commands](./commands.mdx).
In short, the app runs locally on port 5173 with hot reload (`vp run dev`) and as the production build on
4173 (`vp run preview`), and the checks run on that same local host. Every branch other than `main` gets a
preview on Cloudflare: [on Cloudflare](#on-cloudflare), below. The agent's own browser on a laptop
(`vpx chrome-devtools-mcp`, Chrome DevTools) is not CI: the checks never use it.

`vp run ci` runs the whole suite on the production build, here and on GitHub. To run it against a deployed URL (a
branch's Preview, or production):

```sh
pnpm remy test remote https://your-worker.your-subdomain.workers.dev
```

The URL must be an origin, without a path or query. The checks that
need a new person read their code from the local mail capture, so they run against the local target
only. The rest ask the Worker which environment it is (`/healthz`) and expect what
[the table](./auth.md#environments-one-table) gives it: against a Preview the seeded people are there
and one press signs in as one of them; against production none of it exists. The remote test task can
also target an already-running local preview to check the external-server path.

The commands are remy-cli's (`remy`), each reading what it needs where it is kept (the origins: the app's `.env`); this repository's own are its tasks (the root `vite.config.ts`: `ready`, `new-app`, `skills:build`,
`release:publish`) and scripts. The Playwright
configuration is the package's `playwrightConfig()`.

There is one Worker configuration, `wrangler.jsonc`: production, and its `previews` section for every branch's
Preview (its own databases and secret, `ENVIRONMENT: "staging"`, so the test sign-in is on). There is no separate
staging Worker: a Preview is it (owner, 2026-10-18). Keep the implementation shared; vary only resource
identifiers, secrets and other environment values. Bindings and vars are not inherited by the `previews` section:
each is declared again there. Do not copy the application or use remote bindings for
ordinary local development. Local secrets stay in ignored `.dev.vars`; deployed
secrets are managed through Cloudflare. Local data is not uploaded by deployment.

## Two kinds of page

[`packages/remy-ui/src/paths.ts`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/paths.ts) is the one list of pages and says what
each kind promises; the two are never mixed.

- **Site pages** (`sitePaths`: the home and formats) are for Google: complete in the server's HTML
  without JavaScript, indexed, in the sitemap with `hreflang` alternates, and judged by Google's audits.
  Their frame is `SiteShell` in [`shell.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/shell.tsx), built from static
  shadcn parts.
- **App pages** (`appPaths`, under `/app`) need JavaScript, carry `noindex` (added by `pageHead`)
  and stay out of the sitemap. Their frame is `AppShell` in
  [`app-shell.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/app-shell.tsx), shadcn's sidebar-16 block owned in
  [`blocks/sidebar-16`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/blocks/sidebar-16/README.md).

The docs are not this app's pages: they are the docs Worker (`apps/remy-auth-docs/` here, an app's `docs/`;
Fumadocs), with the guide at `/docs`,
these developer docs at `/dev` and the API reference at `/reference`, each with search and Ask AI
([writing docs](./writing-docs.mdx)). The app's header links there, and its old `/<locale>/docs/...`
addresses redirect there permanently.

The language picker follows the kind: site pages use `LanguageSwitcher`, plain links that need no
JavaScript; app pages use `LanguageMenu`, shadcn's DropdownMenu calling Paraglide's `setLocale`
(both in [`language.tsx`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/language.tsx)).

## What is implemented

Every page exists in every locale (13 prefixes such as `/en`, `/ar`, `/ja`; the docs pages in English only); the table names them without it.

| Route | Kind | Behavior |
| --- | --- | --- |
| `/`, `/formats`, `/app`, ... (every path without a locale) | Entry | Redirect to the visitor's language: Paraglide's `cookie` (a remembered choice), then `preferredLanguage` (Accept-Language), else English, with `Vary`. These entry URLs are the `x-default` targets |
| `/en` | Site | Localized home with direction, metadata and alternate links |
| `/en/formats` | Site | The locale's conventions in five sections (this language, dates and times, numbers, money, words), each search-param control in the section it changes; the dates include the visitor's place from Cloudflare's request geolocation, streamed behind `Await` and never stored, and the device's own time zone. `?currency`, `?count` and `?calendar` are typed, validated search params (defaults left out of URLs, invalid values redirect to the canonical URL); loader data stays fresh for five minutes. The content is `FormatsContent`, shared with `/app/formats` |
| `/en/time-zones/Asia/Tokyo` (any IANA name) | Site | Sub-resource of the formats page: the zone's localized name, offset and the sample instant there. An unknown name is a localized 404 naming it (`notFound()`); another spelling of a known name answers 301. Not in the sitemap |
| `/en/app` | App | Live status card: TanStack Query over the contract's `GET /api/status` (the router itself during SSR, HTTP in the browser), server-rendered, polled every 10 s, with a refresh that invalidates every loader and query at once (`invalidateEverything` in `@joeblew999/remy-ui/invalidate`); the card itself is the status-card part's (`@joeblew999/remy-showcase/parts/status-card/card`), which remy-auth-app shows too, asked across origins (CORS for its registered origin, `src/api/origins.ts`) |
| `/en/app/formats` | App | The formats page's content in the app frame |
| `/en/app/demo` | App | `ssr: false`. Counter and reservation form validated in the browser and again by the contract's `POST /api/reservations` (a TanStack Query mutation), which answers in the page's language; broken rules come back as its typed 400 and show as the form's own errors; leaving with unsaved input asks first (`useBlocker`) |
| `/en/app/location` | App | Cloudflare's location of the request beside the device's own, which the Geolocation API gives only after the visitor presses its button |
| `/en/app/account` | App | Who is signed in (name and email, with sign-out), or the sign-in form: an email address, then the six-digit code Better Auth sends to it (TanStack Form; Better Auth's client calling `/api/auth`). The loader asks a server function that calls the contract's `me` inside the server, so the server renders the right state from the page's cookies and never caches it. The code's email is written in the page's language and sent through Cloudflare Email Service. Where the environment offers seeded people (local only), the form lists them with their role and what they hold, one press to sign in as each. Where no sign-in code could be delivered it keeps the shared empty state instead of the form |
| `/en/app/settings` | App | The language and the appearance (kept on the device), what the device tells the app, [the product's name](#the-products-name) where it is used and how another name would read, and [what is deployed](#which-version-is-deployed) |
| `/en/app/notes` | App | remy-auth's own page, the notes demo: a signed-in person writes notes and shares each with an address, to read or to edit. Who may do what is decided by relations (its author, its editors, its readers; `packages/remy-auth-contract/src/notes.ts` holds the vocabulary), the server enforces it through the guard, and the page shows a control only inside `<Allowed>`, from the permissions the server sent with each note. Signed out, it points at the account page |
| `/api/status`, `/api/me`, `/api/notes`..., `/api/reservations` | API | Contract endpoints ([@joeblew999/remy-auth-contract](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-auth-contract/README.md)) served by oRPC behind one Start server route (`src/routes/api.$.ts`, `src/api/`): input and output validated, typed errors, the language from Accept-Language (Paraglide's `routeStrategies`), no locale in the URL. Each runs behind the platform's guard, which enforces its contract policy: `status` and `reservations` are public, `me` and the notes list answer only a signed-in person and refuse anyone else with 401, and each change to a note is an action the relation engine decides (404 for a note that does not exist, 403 without a relation that allows it) |
| `/api/auth/*` | API | Better Auth's own endpoints (send a code, sign in, the session, sign out) behind one catch-all Start server route (`src/routes/api.auth.$.ts`), on the Worker's D1 database (`DB`); not part of the contract or its document |
| `/dev/mail`, `/dev/people` | Local only | The local environment's outbox (the mail captured for `?recipient=` instead of sent) and its seeded sign-in (the people it offers, what each holds, and the published code they sign in with); 404 in any other environment (the table in `src/auth/environment.ts`, [explained](./auth.md#environments-one-table)) |
| `/healthz` | Every Worker | Liveness, and [which deployment answered](#which-version-is-deployed): its environment, Cloudflare's version and the build stamp |
| `/api/openapi.json`, `/api/doc` | API | The OpenAPI 3.1 document generated from the router in-process, and its reference page (oRPC's Scalar page, script pinned) |
| `/robots.txt`, `/sitemap.xml` | Server routes | `Cache-Control: public, max-age=3600, s-maxage=3600`; methods other than GET and HEAD answer 405 with `Allow`; the sitemap lists the site pages in every locale with `hreflang` alternates |
| Unknown route or locale | | HTTP 404 with the localized not-found page (an un-localized unknown path first redirects to the visitor's language, as TanStack's rewrite canonicalizes it) |
| A page's loader failing | | That route's localized error page (500 when server-rendered) with a retry that re-runs the loaders; every page route and the root set both problem pages (`src/problem.tsx`) |

Localized pages never redirect. When the visitor's preferred language differs from the page, a dismissible hint offers that version; choosing or dismissing is remembered in Paraglide's `PARAGLIDE_LOCALE` cookie, which only the entry URLs act on. Locale detection, the cookie, URL localisation and the redirect are Paraglide's own strategies and middleware (`packages/remy-ui/paraglide.mjs` holds the one compiler configuration), wired as Paraglide's official TanStack Start integration: the middleware wraps the Worker entry, and the router's `rewrite` removes the locale before matching and adds it to every link, so routes carry no locale segment.

TanStack Start runs through Cloudflare's Vite plugin ([`apps/remy-auth/vite.config.ts`](https://github.com/joeblew999/remy-auth/blob/main/apps/remy-auth/vite.config.ts), the package's `remyApp()`). Every
route is server-rendered except the demo. In-app links preload their route's code and data on
intent; language changes on site pages are full navigations.

## shadcn, stock

Components and the theme are what the shadcn CLI writes, in shadcn's monorepo layout: this app's
[`apps/remy-auth/components.json`](https://github.com/joeblew999/remy-auth/blob/main/apps/remy-auth/components.json) routes `shadcn add` into the package
([`packages/remy-ui/components.json`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/components.json)), and
`packages/remy-ui/src/styles/globals.css` is written by the CLI too. Nobody edits either by hand; the
scripts in [`package.json`](https://github.com/joeblew999/remy-auth/blob/main/package.json) are the only way they change:

```sh
vp run ui:components       # Re-add every shadcn component (extend the list there to add one)
vp run ui:theme            # Rewrite globals.css with shadcn's default theme
vp run ui:blocks           # Diff each owned block against upstream, in place
vp run check:shadcn        # Re-run both and fail on any difference (the pre-commit hook, when a commit stages one)
```

Blocks are owned copies, as shadcn intends; sidebar-16's README says what was changed. The
package's `components` alias (`@joeblew999/remy-ui/blocks`) is where shadcn writes a block's own
files when run from the package (`shadcn add <block> -c packages/remy-ui`): `blocks/<name>/components`.
So `ui:blocks` diffs them in place and upstream changes are merged by hand.

Fonts live in [`packages/remy-ui/src/fonts.css`](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/fonts.css), imported after
`globals.css` (see [`src/styles.css`](https://github.com/joeblew999/remy-auth/blob/main/apps/remy-auth/src/styles.css)); the file explains its rules. fontaine in
the app's Vite configuration (`remyApp()`) generates the size-matched fallback faces it names.
`publicPageChecks` fails on any named family that is not loaded.

## On Cloudflare

There is one way to deploy: push. Cloudflare builds and deploys this repository itself, from GitHub; nothing of ours
uploads code, and nobody runs `wrangler deploy` by hand (owner, 2026-10-18: "you've got multiple ways to deploy.
It's bloody confusing"). The words, one meaning each:

| Word | What it is | What makes it happen | Where it answers |
| --- | --- | --- | --- |
| **Deploy** | a new version of a Worker goes live at its address | a build that ends in `pnpm wrangler deploy` | the Worker's address |
| **Production deploy** | `main` going live | every push to `main` (Cloudflare's Git build, Workers Builds) | `https://remy-auth.gedw99.workers.dev`, `https://remy-auth-docs.gedw99.workers.dev` |
| **Preview** | a branch's own copy, with its own databases and the test sign-in (`wrangler.jsonc`'s `previews`, `ENVIRONMENT: "staging"`) | every push to any other branch (the same Git build, ending in `pnpm wrangler preview`) | `https://<branch>-remy-auth.gedw99.workers.dev` (a `/` in the branch becomes `-`) |
| **Rebuild** | one of those builds run again, for a commit already pushed | the Workers Builds API (the connector), or the dashboard's Retry | as above |

- **Two Workers, one per app, each with its own Git build**, both at the repository's `main`: `remy-auth`
  (root `/apps/remy-auth`) and `remy-auth-docs` (root `/apps/remy-auth-docs`), each with its own `wrangler.jsonc`.
  Each build installs with pnpm (from `pnpm-lock.yaml`, the build variable `PNPM_VERSION` as in `devEngines`,
  `NODE_VERSION` as in `.node-version`), then runs `pnpm vp run build`, then the app's own script, `pnpm run deploy` on `main` and
  `pnpm run deploy:preview` elsewhere (the docs: `pnpm wrangler deploy` and `pnpm wrangler preview`). The app's scripts
  apply its databases' migrations first (`wrangler d1 migrations apply … --remote`, the Previews' through
  `previews.wrangler.jsonc`), then upload, so a new table goes live with the code that needs it and a failing
  migration leaves the old version live. The docs need no step of their own: the docs Worker writes its pages to
  Ask AI's bucket itself on the first request after each new version (its `DOCS_PAGES` binding). Which script each build runs lives on Cloudflare; what the scripts do is in the repository.
- **From the owner's Mac** (signed in to Cloudflare): Wrangler itself (`pnpm wrangler deployments list`,
  `pnpm wrangler tail`, reading only); migrations and Ask AI's index need nobody, since the deploys run them. **From Claude's cloud** (no Cloudflare login for Wrangler): push, and Cloudflare
  builds; the Cloudflare connector shows a build and its log, changes the build settings and starts a rebuild.
  Then check a Preview: `pnpm remy test remote https://<branch>-remy-auth.gedw99.workers.dev` (our checks only: a
  Preview is hidden from search engines on purpose, so Google's audits judge production).
- **Speed far from the databases**: the Worker runs with Smart Placement (`wrangler.jsonc`, checked by
  `check:wrangler` in `vp run ready`), and every request reads through its own D1 session, so reads come from the
  nearest copy (`@joeblew999/remy-ui/replicas`; a unit check refuses app code using a database binding raw).
- **Every D1 database keeps read copies and lives in production's region**: the platform's rule, which
  `pnpm remy cloudflare provisioned` asks Cloudflare about, the Previews' databases included, naming the fix.
  Neither is a setting Wrangler's configuration can hold.

## Which version is deployed

Nothing records what is deployed: each deployment says what it is when asked, so the answer cannot be
out of date (the design is remy-sport's, whose committed record of deployments was wrong for weeks).

- **The build stamp.** `remyApp()` and `remyDocs()` work it out once per build from the sources: the
  app's package, the commit, a short hash of anything uncommitted, and the installed version of each
  platform package (`build: { packages: [...] }` in `remyApp()` lists more). The same checkout builds
  the same stamp; there is no build time in it, so a bundle changes only when its code does.
- **`/healthz`**, on every Worker built on the package, answers with it: `service`, `environment`
  (what the Worker declares; production when it declares none), `release` and `deployedAt` (Cloudflare's
  version and when it was given it) and `build`. It names nobody, and any origin may read it.
- **`BuildStamp`** (`@joeblew999/remy-ui/versions`) is in the app frame's footer, so every app page of
  every app has it: the environment unless it is production, the product's name, the commit. The page
  carries the stamp it was built with; when its deployment answers with another, the page is a tab
  left open across a deploy, and the stamp offers the reload. It never reloads by itself.
- **`Versions`**, for a settings or about page: this app, its docs Worker (`docs` in `defineRemyApp`)
  and the `deployments` the app lists there (a service it calls), each
  answering for itself, then the packages this build was made with. remy-auth's Settings page shows
  it.
- **`curl <origin>/healthz`** asks one deployment (the origins are in the app's `.env`), and
  `pnpm wrangler deployments list` gives Cloudflare's own list of a Worker's deployments. Ask before saying what is
  live.

The shared check sets prove it in every app: `/healthz` names this checkout's commit on a local run
(a stamp left over from an earlier build fails), and the frame offers the reload only when the
deployment has moved on.

## The product's name

Remy is this prototype's name. A project built on the same code has its own, and writes it once:

```ts
// docs/docs.config.ts: the docs say it, and the app takes it from here
const product = 'Harbor';
export const docsConfig = defineDocsConfig({ product, ... });

// src/remy-app.tsx
export const remyApp = defineRemyApp({ brand: docsConfig.product, ... });
```

An app without docs writes `brand` directly. Everything a person reads takes the name from there: the
frame, every page's title, the home page's structured data, and every message that says the name,
which takes it as a parameter:

```tsx
m.home_title({ product: useRemyApp().brand }, { locale })                       // in a page
pageHead({ ..., description: (locale, product) => m.home_description({ product }, { locale }) })   // in a head
codeMail({ otp, product }, locale)                                              // the sign-in email
```

A message that names the product is written with `{product}`, never with a name, so Paraglide's types
refuse a caller that leaves it out. remy-auth's Settings page shows where the name is used, and how
each place reads under another name.

What is not the product's name, and stays: the packages (`@joeblew999/remy-ui`), the `remy` skill, task
names, a Worker's service name and an MCP server's name. Those are identifiers a developer sees.

Checks: every page's title ends with the app's name, and an app of another name never shows "Remy"
(`productNameChecks`, in every app's shared set; the consumer fixture, called "My app", is where it
bites); the platform's catalog names no product (`tests/product.spec.ts`).

## Structure and reuse

The app is `apps/remy-auth/` (its paths below are from there); the packages beside it are `packages/*`,
the docs `apps/remy-auth-docs/`, all one pnpm workspace (`pnpm-workspace.yaml`) whose root holds the repository's
own checks.

- `src/routes/`: TanStack file routes (loaders, `head`, per-route rendering) that render the package's pages, plus this app's extra formats rows (`src/formats-extras.tsx`), while `robots.txt` and `sitemap.xml` (the seo-routes part) and `/csp-report` (`app-routes`) are the package's server routes, mounted beside them; `src/routeTree.gen.ts` is generated by the router plugin during dev and build and committed.
- `src/server.ts`: Worker entry through the package's `localizedWorker` (request IDs, structured status logs, `/healthz`, Paraglide's middleware, entry redirects). Start receives the original request, so server functions read Cloudflare's geolocation from the request's `cf` properties in a server-only module under Start's import protection (`packages/remy-showcase/src/parts/deferred-place/place.server.ts`, the showcase's deferred-place part). The wrapper passes its request ID inward as `X-Request-ID`; Start's request middleware exposes it as `context.requestId`, and a function middleware logs one `server_fn` line per call (the package's `start`, registered in `src/start.ts`). A second request middleware there makes the per-request CSP nonce that the shared router (`router`) hands to TanStack Router, and the package's server route `/csp-report` (`app-routes`) logs the policy's reports ([security headers](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/parked/gui-portal.md)). The service name has one home, `src/service.ts`.
- `src/api/`: the contract's implementation (`router.ts`, behind the guard; no Workers imports so the checks load it in Node), each call's context, with the caller's session (`context.server.ts`), and the isomorphic client with its TanStack Query utilities (`client.ts`). The contract is `packages/remy-auth-contract/`; the shared mechanism is the package's `api/*` exports; [the contracts plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/openapi-contracts.md) owns the design.
- `src/auth/`: Better Auth in this Worker ([the auth plan](https://github.com/joeblew999/remy-auth/issues/38)): its options, shared by the Worker and the CLI (`options.ts`), the instance built on first use from the D1 binding (`auth.server.ts`), the CLI's configuration (`cli.ts`), the environment table (`environment.ts`), the seeded people (`seed.ts`, `people.server.ts`), mail delivery and the code's email (`mail.server.ts`, `code-mail.ts`), the rule on fields a person can write (`fields.ts`), the account server function (`account.ts`) and the sign-in form, its picker and Better Auth's browser client (`sign-in.tsx`, `client.ts`). `migrations/` holds the numbered D1 migrations ([the Better Auth scripts](./tooling.md#the-tooling)).
- `src/notes/`: the notes demo, which uses the relation engine as any app would: its data in its own D1 (`DEMO_DB`, `migrations-demo/`; a person is only an account ID there) through `store.ts`, the page (`page.tsx`) and the server function its loader asks (`state.ts`). The vocabulary and the shapes are the contract's (`packages/remy-auth-contract/src/notes.ts`).
- `src/router.tsx`: the package's `remyRouter`, a new router and TanStack Query client per request, with Query's SSR integration. `src/routes/__root.tsx` is the package's `remyRoot` with this app's config; TanStack Devtools (Router and Query panels) is passed in there, in the app's own file, because its `devtools()` Vite plugin strips it from production builds only outside `node_modules`; the build-boundary check proves no devtools or server-only code reaches the browser.
- `src/parts.json`: the package's [parts](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/parts.md) this app uses, one per line (the showcase's `@joeblew999/remy-showcase/time-zones`, `deferred-place` and `status-card`, and the platform's `seo-routes`); `remyApp()` (in `vite.config.ts`) mounts their routes and `partChecks()` in `tests/gui.spec.ts` runs their checks.
- `packages/remy-ui/` (at the root): everything both apps share; its [README](./remy-ui.md) lists the exports.
- `tests/`: the app's browser checks: the package's shared checks (`@joeblew999/remy-ui/checks`, the showcase's `@joeblew999/remy-showcase/*.checks`) plus the checks only this repository owns (catalogs, concurrent server renders, hydration, its extra formats rows); `lighthouse.spec.ts` is `vp run ci`'s `audits` part and `performance.spec.ts` Core Web Vitals on a deployment (`pnpm remy test cwv`).

Locale is passed explicitly into compiled message functions; concurrent requests share no
mutable locale state. The catalogs are the `locales` in
[settings.json](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/project.inlang/settings.json); every one except English and Spanish
was written by an agent and is unreviewed. Direction, endonyms, dates, numbers, currency and plurals
follow the decisions recorded in
[the GUI plan](https://github.com/joeblew999/remy-auth/blob/0e42ab7/.plans/done/gui.md#dates-numbers-currency-and-direction).

The package's real consumer is [remy-auth-app](https://github.com/joeblew999/remy-auth-app),
which installs the published package and runs its checks on prerendered pages, while this app
runs them on server-rendered ones.

## Evidence and limits

`vp run ci` runs every check (`vp run ready`), then the browser checks (`test:browser`), then Google's Lighthouse audits
(`test:audits`), one after the other (a release then adds a brand-new app on this commit's packages, `new-app`): the
audits measure speed, so they never run beside another browser run. GitHub runs the same tasks as parallel jobs (the
browser checks in three slices, `vp run test:browser --shard 1/3`). Core Web Vitals are measured on a deployment, by
hand (`pnpm remy test cwv`: production, or a Preview's origin). There are no levels to choose and no part decides to skip itself, and what
nothing touched comes from Vite Plus's cache instead of running again. What is tested is decided once, by what a check
can show (owner, 2026-10-17: "you really need to decide what is tested and what isn't"):

- A check of how text is drawn (fonts and scripts, hyphenation, direction, fitting a phone, formats) runs in one
  language per way the app draws text (`checkedLocales`): each language fonts.css gives its own font stack, each Han
  language, and English for the shared default stack; 9 of the 13 today, worked out from fonts.css. Spanish, Polish,
  Turkish and German draw exactly as English does.
- A check of behaviour that does not depend on the language (the security policy, noindex, search params, the demo
  form, error pages, API answers) runs in English and the first right-to-left language (`behaviourLocales`).
- What does differ in every language is checked in every language: the catalogs and their plurals (the unit checks),
  the sitemap, hreflang and the language switcher, and the casing and hyphenation samples.
- A release runs the same languages: one per way of drawing text. The rest draw through the same code, so running
  them found nothing more and took four minutes; whether every language's text exists is `remy i18n check`'s, offline.
  By hand, `CHECK_LOCALES` takes `quick` (English and Arabic) or a comma-separated list.
What the checks cover is the checks themselves: `tests/` and the package's
`@joeblew999/remy-ui/checks` (each check's title says what it proves); the flow's steps that run them are in
[how we work](./how-we-work.md#the-flow-the-standard-way-in-plain-sight). In short: every page in every
language without JavaScript (language, direction, metadata, links), catalogs and plurals, the formats
values against Intl, entry redirects and the language hint, hydration, the demo form and the API,
HTTP statuses, the sitemap and `hreflang`, security headers and the CSP nonce, narrow screens, and
the docs, search and ask pages.

Google's level covers site pages only (app pages are noindex by design): Lighthouse audits `/en`
(mobile and desktop), `/es`, `/ar` and `/en/formats`
([`tests/lighthouse.spec.ts`](https://github.com/joeblew999/remy-auth/blob/main/apps/remy-auth/tests/lighthouse.spec.ts)); Core Web Vitals, from Google's pinned
`lighthouse` package, judge `/en` (mobile and desktop) and `/en/formats`
([`tests/performance.spec.ts`](https://github.com/joeblew999/remy-auth/blob/main/apps/remy-auth/tests/performance.spec.ts)) against Google's good thresholds (LCP
2.5 s, CLS 0.1, TBT 200 ms, Performance at least 0.9), on a deployment
(`pnpm remy test cwv`: production unless a Preview's origin is given), not localhost.

Limits: no organizations, OAuth tokens or cross-app sign-in yet, so only remy-auth's own pages know
who is signed in ([the auth plan](https://github.com/joeblew999/remy-auth/issues/38)). The site is served from its workers.dev address (`VITE_DEPLOY_ORIGIN` in the app's `.env`); the production public origin and
Search Console are owner decisions.

Known tooling notices: Node may print the Chrome DevTools localStorage experimental
warning; pnpm runs no install script outside `allowBuilds` (`pnpm-workspace.yaml`) and may name the ones it
skipped; Vite's isolated package
check may report that Base UI's `use client` directives are ignored in a plain
client bundle. These notices do not change the tested behaviors.
