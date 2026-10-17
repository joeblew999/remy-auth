---
title: "The command line"
description: "remy, the tooling every Remy app installs with the package: the scripts, the layout they read, a new app, publishing packages, translations, Cloudflare and plans."
---

The tooling is `remy`, the bin of `@joeblew999/remy-ui` (`packages/ui/src/cli`, one TypeScript module per
command); an app gets it with the package (`npm install`, at the package's version) and names it in its
`package.json` scripts, the same ones in every app (`"dev:change": "remy flow change"`). An app says once, in
`remy.config.ts`, where it is deployed and its ports:

```ts
import type { RemyProject } from '@joeblew999/remy-ui/project';

export default {
  origins: { production: 'https://your-app.your-subdomain.workers.dev', docs: 'https://your-app-docs.your-subdomain.workers.dev' },
  ports: { preview: 4173, docsPreview: 4174 },   // the main checkout's; a worktree computes its own from its name
} satisfies RemyProject;
```

### The layout

Every Remy repo, remy-auth included, has the same files in the same places; what is inside the product's
files differs. The layout is the paths the commands and the package read, so a file
anywhere else is simply not found; no checker of its own keeps it.

| Path | Read by | Holds |
| --- | --- | --- |
| `package.json`'s `scripts`, `remy.config.ts`, `.node-version` | npm, `remy` | the entry: every command; the origins, ports and release package; the Node version |
| `package.json`, `package-lock.json` | npm, `remy` (workspaces) | the app's dependencies; `workspaces` when it owns packages |
| `wrangler.jsonc` | wrangler, the Cloudflare Vite plugin, `remy cloudflare` | the Worker's name, bindings and assets |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Vite, `remy check types`, `remy test` | the build, types and browser checks |
| `fnox.toml`, `skills-lock.json` | fnox, `remy skills` | secret names; the pinned skills |
| `src/routes/`, `src/routeTree.gen.ts` | TanStack Start (the tree is generated) | the product's pages |
| `src/parts.json` | the package's `remyParts()` | the shared parts the app lists (none without the file; the blank app lists `seo-routes`) |
| `src/api/` | the app's `api.$` route | the product's procedures, if it has an API |
| `tests/` (`smoke.spec.ts` by name) | `remy test`, the live smoke after a deploy | the shared checks with the app's settings, and its own |
| `public/` | Vite | favicon, `_headers` |
| `dist/` (`dist/client/assets`) | the deploys, the checks | build output, never committed |
| `docs/` (`docs.config.ts`, `vite.config.ts`, `tsconfig.json`, `package.json`, `content/{users,dev,ui}/` with `i18n.json` and `meta.json`, `content/questions.json`; generated `.remy-docs/`, `dist/`) | `remy docs`, `remy i18n` (`I18N_DOCS_DIR`) | the app's docs: its identity and pages; the Worker is the package's |
| `packages/<name>/` with `README.md` | `remy plans`, `remy packages` | packages the repo publishes, if any |
| `messages/`, `project.inlang/` | the app preset, the app's `generate` script, `remy i18n` | the app's own strings, if any (compiled into `src/paraglide/`) |
| `.plans/` (`now.md`, `done/`, `parked/`) | `remy plans` | the repo's plans |
| `AGENTS.md`, `.github/workflows/` | agents; GitHub | the agents' pointer at the docs; CI |
| `packages/ui/src/cli/`, `template/`, `fixtures/consumer/` | the package; `giget`; `npm run ci -- new-app` | remy-auth only: the command line itself, the blank app a new repo starts from, and the consumer fixture that tests both as another repo gets them |

### A new consumer

The one recipe. A new app starts from the blank app, [`template/`](https://github.com/joeblew999/remy-auth/tree/main/template)
in remy-auth at the release tag: the layout above with only the repo's own files in it (its names, one
home page in every language, a docs index per site, the layout's config files at a few lines each).
Everything else is the package, which one version bump upgrades.

1. Prerequisites: Node as `.node-version` says, `gh auth login` with a token that has `read:packages`,
   Google Chrome (the checks use it), and `wrangler login` before the first deploy.
2. `npx -y giget@3.3.1 gh:joeblew999/remy-auth/template#vX.Y.Z <name>`, then `cd <name>` and `git init`
   (the translation and plans tools read git history; `npm run setup` says so if it is missing).
3. Name the app: replace `my-app` and `My app` (`grep -rn -i "my.app" --exclude-dir=node_modules .`):
   `package.json`, `wrangler.jsonc`, `src/service.ts`, `remy.config.ts`'s origins, `docs/docs.config.ts` (the
   product's name and source, which the app's frame reads too) and `messages/en.json`.
4. Node as `.node-version` says, then `GITHUB_TOKEN=$(gh auth token) npm install` once to write
   `package-lock.json`, then `npm run setup` (npm ci, the pinned skills and the `remy` skill, the
   `AGENTS.md` rules block, MCP registration, the flow's guard, the installation's checks).
5. Commit everything, `package-lock.json`, `skills-lock.json` and `src/routeTree.gen.ts` included. The
   blank app's strings come translated; after the English changes (`messages/en.json`, the docs), commit it
   and translate this once by hand, `REMY_FLOW=hand npx remy i18n translate`, which writes and commits
   the other languages; from then on `dev:land` does it.
6. The first deploy, by hand: `npx remy cloudflare deploy`, and `npx remy cloudflare docs-deploy` for the
   docs. Once the
   repository is on GitHub (step 7), work goes through [the flow](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest):
   `dev:land` for every finished change, `dev:promote` for production and the docs.
7. CI: `.github/workflows/ci.yml` calls remy-auth's shared workflow at the same tag (every language, Google's
   audits on every push to `main`). Grant the new repository read access in the `@joeblew999/remy-ui`
   package's settings ("Manage Actions access"), or `npm ci` fails there.

Then the app grows in its own files: pages in `src/routes/` (a page beside a parent's path, such as
`videos.$videoId` next to `videos`, is `videos_.$videoId.tsx`: TanStack nests `videos.$videoId` inside
`videos`, which then needs an `<Outlet />`), their links in `src/remy-app.tsx`, strings in `messages/en.json`
(`m` from `src/paraglide/messages.js`), an API as a contract package and `src/api/` (every procedure that
takes input documents an error, or `apiChecks` fails: the package's `api/coverage` rule), docs in
`docs/content/`. Move to a new release with `npm run upgrade -- <version>` (the package and the CI
workflow's tag together). Two local browser runs at once share `PREVIEW_PORT` and the second fails to
start its server: give each shell its own (`PREVIEW_PORT=4232 npm run …`).

### A repository that publishes packages

A repository may also publish packages of its own (a contract, a UI package), as remy-auth does; that
costs no command of its own. Its packages are npm workspaces (`packages/<name>/`, `package.json`'s
`workspaces`), and each one that is not `private` is published by `remy packages` (`npm run packages -- …`):

| Command | Does |
| --- | --- |
| `check`, `upgrade` | Newer npm versions of the repository's own dependencies (root and workspaces; never its own packages or `@joeblew999/remy-ui`), previewed (`check`) or applied, then the installation's checks (`upgrade`) |
| `pack` | A tarball of each published package, for a scratch app to install before any release |
| `release` | The gates (translations strict, every changed package bumped, `remy verify`, the app's `release-checks` script, Google's audits, Core Web Vitals), then `tag`; `dev:release` runs it |
| `tag` | On a clean `main`: tag the release package's version, push, then `publish --release` |
| `publish` | Publish each package whose version is new on its registry; with `--release vX.Y.Z` also the GitHub release from `CHANGELOG.md` (`notes`). The tag's CI job runs the same command |

In `remy.config.ts`: `release.package` (the package whose version names the release) and
`release.title`. A package's `exports` name every subpath its users import (`"./video": "./src/video.ts"`);
anything else is refused at build time and in Playwright, whose message names the importing file, not the
export map. A package's own strings are its own inlang project, compiled by its build, whose runtime
follows the platform's language with one call, `followLocale(runtime)` (`locale`); the i18n tasks read it
through `I18N_INLANG`. Checks the repository adds to a release go in its `release-checks` script (remy-auth:
`template:check`, `ui:verify`). remy-auth sets a release's version with `npm run ui:version -- X.Y.Z`, which
writes it everywhere it appears (the package and the blank app's pins).

### Choosing the version: released, development or local

The tooling and the package are one thing: remy-auth's `npm run dev:release` publishes `@joeblew999/remy-ui`
X.Y.Z, bin included, and tags the same commit `vX.Y.Z`. A consumer pins that one number in its
`package.json` (and its CI workflow's tag), and `npm run upgrade -- X.Y.Z` moves both. To work against
remy-auth's own checkout, `npm link ../remy-auth/packages/ui` (and `npm unlink` back).

The platform supplies every npm package the app and the tasks need, at one version: they are
`@joeblew999/remy-ui`'s own dependencies (the framework, the toolchain, the checks' tools), so an app's
`package.json` names the package, its own packages and whatever its product adds. `the check's single-copies part`
(in `remy check`) fails when a package that breaks when installed twice (React, TanStack Router and
Query, the MDX stringifier; the package's `remy.singleCopy` list) is: remove the app's own pin. The commands call an
app's own hooks where it has them, as scripts of its `package.json`, run if present: `generate` (code
generated before type checking; the blank app's compiles its own catalog), `local` (the local state an
app needs before it runs, which `dev`, `build` and `dev:start` run first; remy-auth writes its `.dev.vars`
and migrates its local D1 there), `release-checks` and `test:consumers`.

The development flow is code, `packages/ui/src/cli/flow.ts`, with four steps and a guard. The flow, step by step, and who runs each: [how we work](./how-we-work.md#the-flow-four-steps-and-a-guard-that-refuses-the-rest); every command: [Commands](./commands.mdx).

`remy verify` (the release gate) runs the browser checks in every language, then the new-app test, as `npm run ci`'s
`browser` and `new-app` parts do: the other repositories this one serves tested as they get it: the app's
`test:consumers` script, nothing by default; in remy-auth, the new-app test (`fixtures/consumer`), which builds the blank app and a package it owns from this commit's platform
(the package from a tarball with a version of its own, the tasks from a copy outside any `node_modules`, the
template's `.npmrc`) and runs install, skills (installed once per pinned list, then reused), the tooling invariants, the check, the quick browser checks, the docs and a dry-run publish (~1.5 to 3 min, mostly the network).
A change that would break another repository fails there, not in that repository. Tests are type-checked with
the app (`tsconfig.json` includes `tests/`). Google's audits are
`npm run ci -- audits` (Lighthouse, local; CI whenever a change can affect it, and on every push to main and every tag) and Core Web Vitals is
`npm run test -- cwv` (on a throwaway Cloudflare Worker); the release runs both.

Where checks run: the shared package's own behaviour is proven once, in remy-auth, before each
release. An app built on the package runs a contract set (its pages render, site and app pages stay
apart, its own features work) plus Google's level on its own site pages, not the whole package
suite again. Keep checks cheap rather than dropping them (Playwright's clock rather than real
waits, one browser page per check, parallel workers). Checks loop over `checkedLocales` from
`@joeblew999/remy-ui/checks`, which honours `CHECK_LOCALES` (a comma-separated list, or `quick`: the base
language and the first right-to-left one, which the checks work out themselves, so no command names languages). Every step says how long it took.

### Translations

One layout in every app, so the same `remy i18n` commands work everywhere (the rule for who translates is
[in the change](./how-we-work.md#translations-in-the-change)):

| What | English | Translation |
| --- | --- | --- |
| Docs | `docs/content/<site>/<page>.md` or `.mdx` (Fumadocs' layout) | beside it: `<page>.<locale>.md` or `.mdx` |
| UI catalogs | the base locale's catalog of each inlang project (`<dir>/project.inlang`) | each locale's catalog, by the project's own `pathPattern` (e.g. `messages/<locale>.json`) |

Two pipelines, one for each kind of text, the same pattern in both: detect offline from each
translation's record of what it was made from, translate with the machine's Claude Code (headless, no
tools), write the translations and their records (the change commits them). Both are TypeScript in the package
(`packages/ui/src/cli/i18n.ts`, `translate.ts`: `remy i18n check`, `remy i18n translate`); the tasks below
forward to them.

- **UI messages** (Paraglide): the catalogs, locales and base locale come from inlang's own
  `settings.json` (`I18N_INLANG`, else the one project git knows). Detected: missing catalogs and keys
  (`jq`), lost or invented `{placeholders}` (`@lingual/i18n-check`), keys whose English differs from the
  catalog's record (`translated-from/<locale>.json` beside it), plural categories the locale needs (`Intl.PluralRules`,
  `tasks/i18n/messages/plurals.mjs`: no upstream tool checks them).
- **Docs** (Fumadocs): the folder is `I18N_DOCS_DIR` (default `docs/content`); each site with an
  `i18n.json` translates every English page into each of its languages. Detected: missing pages, stale
  ones (their `translatedFrom` frontmatter: a fingerprint per English section), orphans, and Fumadocs UI's own text (`ui/<lang>.json` against `ui/en.json`).
- **The translator** is the machine's Claude Code headless (`claude -p`), with no tools, no MCP
  servers, skills or project settings, and structured output: a catalog's keys come back as JSON and
  are merged in English key order; a stale page's changed sections come back and are spliced in (a page that no longer lines up with its
  record, or a missing one, comes back whole), and it is written only when it is a page (`page.ts`). The prompts are `packages/ui/src/cli/prompts.ts`. One call per language (messages) or per
  page (docs), `I18N_JOBS` at a time.
- Checks need no key, no network and no git history (a shallow clone gives the same answer). Translating
  uses the Claude login on the machine.
- An app with no inlang project and no docs sites gets "nothing to check" and exit 0.

The two commands, `npx remy i18n check` and `npx remy i18n translate`, with their options: [Commands](./commands.mdx).


### Cloudflare

Every `npx remy cloudflare …` command, and `npx remy test remote`, `npx remy observe` and `npx remy upgrade`, with what each does and refuses: [Commands](./commands.mdx). Each says in its header comment whether it is local or remote (and production).

Credentials come from Wrangler's login, or from the keychain through fnox
([tooling](./tooling.md#secrets-fnox)).

### Plans

The plans rule ([how we work](./how-we-work.md#plans-few-short-closed)) as commands (`npm run plans -- …`), the same in
every project: `.plans/now.md` is the one ordered list, `.plans/*.md` the few open plan files,
`.plans/done/` and `.plans/parked/` the rest, `.plans/stability-log.md` optional. A project with no
`.plans/` passes `plans check` and has nothing to list.

| Command | Does |
| --- | --- |
| `status` | Open items in `now.md` by section, open plan files with their first `Status:`/`Closed`/`Parked` line and last commit (STALE after 14 days), parked plans. `--json` for agents |
| `check` | `now.md` exists, every relative `.md` link under `.plans/` resolves, no `.md` outside `.plans/`, `done/` and `parked/`, every open plan file linked from `now.md`. Instant, no network; the check runs it first |
| `close <plan> "<what shipped>"` | Adds `Closed <today>: ...` under the title, moves it to `done/` (from `.plans/` or `parked/`; `git mv` when tracked), repoints relative links to it in `.plans/`, `docs/`, `packages/*/README.md` and the root `*.md`, and its own links from the new folder, strikes its `now.md` item |
| `park <plan> "<why>"` | The same into `parked/` with `Parked <today>: ...` |
| `open <plan> "<why now>"` | A parked plan taken up again: the same from `parked/` back into `.plans/` with `Opened <today>: ...`; add its item to `now.md` yourself |

`close` and `park` change files and stage the move but never commit: read `git diff`, then `npm run dev:change`.
