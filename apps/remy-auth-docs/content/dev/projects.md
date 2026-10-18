---
title: "Projects: layout, new apps and publishing"
description: "What every Remy project keeps in the same place, how to start a new app, publishing packages, translations, Cloudflare and plans. Every command is on Commands."
---

The tooling is `remy` (and `remy-check`), the bins of `@joeblew999/remy-cli` (`packages/remy-cli/src`, one
TypeScript module per command), released with `@joeblew999/remy-ui` under the same version. An app gets both with
`vp install`, at the version in its catalog, runs the command as `pnpm remy …`, and names it in its `package.json`
scripts and `vite.config.ts` tasks, the same ones in every app (`"ci": "vp run ready && vp run test:browser && vp run test:audits"`).
Each value lives in the file of the tool that reads it, never in one of ours: where the app and its docs are
deployed is Vite's `.env` (the command line reads it with Vite's `loadEnv`), each Worker's settings its
`wrangler.jsonc`, the environment of each deployment Wrangler's `vars` (production, the `previews` section, a local
`.dev.vars`):

```sh
# .env
VITE_DEPLOY_ORIGIN=https://your-app.your-subdomain.workers.dev
VITE_DOCS_ORIGIN=https://your-app-docs.your-subdomain.workers.dev
```

A repository that publishes packages keeps its release in Changesets' `.changeset/` ([below](#a-repository-that-publishes-packages)).

### The layout

Every Remy app has the same files in the same places; what is inside the product's files differs. The
layout is the paths the commands and the package read, so a file anywhere else is simply not found; no
checker of its own keeps it. An app is one folder: in its own repository, the repository's root. remy-auth,
which also owns the packages, is a workspace of the same pieces side by side: the app's files below are in
`apps/remy-auth/`, the docs are `apps/remy-auth-docs/` (not `docs/`), the packages `packages/*` (`remy-ui`, `remy-cli`, the contract and the showcase), each folder named after its
package, and the root holds `pnpm-workspace.yaml` (the packages and the catalog), `package.json`'s scripts,
`.changeset/`, the root `vite.config.ts` (the shared style and the repository's checks, `ready`) and the
repository files (`.plans/`, `.github/`, `template/`), as `vp create vite:monorepo` lays a workspace out.
The commands find the app by its `wrangler.jsonc` and the docs by their `docs.config.ts`, so they run from
the root either way.

| Path | Read by | Holds |
| --- | --- | --- |
| `package.json`'s `scripts`, `.node-version` (remy-auth's) | Vite Plus (`vp run`) | the scripts that compose the tasks (`ci`, `translate`, `release`, `setup`; an app's `upgrade`); the Node version |
| `package.json`, `pnpm-workspace.yaml`, `pnpm-lock.yaml`, `.npmrc` | pnpm (through `vp install`) | what each package imports (`catalog:`, `workspace:*`), pnpm's version (`devEngines`); the workspace's packages, the catalog of versions, the single-copy overrides; GitHub Packages as the `@joeblew999` registry |
| `.env` | Vite (`import.meta.env`), `remy` (`loadEnv`) | where the app and its docs are deployed (`VITE_DEPLOY_ORIGIN`, `VITE_DOCS_ORIGIN`) |
| `.changeset/` (`config.json`, a Markdown file per pending change) | Changesets (`pnpm changeset`, `vp run release`) | how the packages are versioned together, and the changes not yet released, in a repository that publishes packages |
| `wrangler.jsonc` | wrangler, the Cloudflare Vite plugin, Cloudflare's Git builds, `remy cloudflare` | the Worker's name, bindings, assets and environment (`vars`, `previews`) |
| `vite.config.ts`, `tsconfig.json`, `playwright.config.ts` | Vite Plus (the tasks written out there, `vp check`), Playwright (`vp run test:browser`) | the build (`remyApp()`), every task, types and browser checks |
| `.vite-hooks/` (`pre-commit`, `pre-push`) | Git, through Vite Plus (`vp config`, the `prepare` script) | the hooks: `vp staged` before a commit, `vp run ci` before a push (`VP_GIT_HOOKS=0` skips them); copied by `remy upgrade` |
| `fnox.toml`, `skills-lock.json` | fnox; the `skills` CLI | secret names; the pinned skills |
| `src/routes/`, `src/routeTree.gen.ts` | TanStack Start (the tree is generated) | the product's pages |
| `src/parts.json` | the package's `remyParts()` | the shared parts the app lists (none without the file; the blank app lists `seo-routes`) |
| `src/api/` | the app's `api.$` route | the product's procedures, if it has an API |
| `tests/` (`smoke.spec.ts` by name) | `remy test` (`remy test live`: the smoke against a deployment) | the shared checks with the app's settings, and its own |
| `public/` | Vite | favicon, `_headers` |
| `dist/` (`dist/client/assets`) | Wrangler (the deploy, its dry run), the checks | build output, never committed |
| `docs/` (`docs.config.ts` with its `contract`, `collections.ts`, `wrangler.jsonc`, `vite.config.ts`, `tsconfig.json`, `package.json`, `content/{users,dev,ui}/` with `i18n.json` and `meta.json`, `content/questions.json`; built `dist/`) | its own tasks, `remy docs`, `remy i18n` | the app's docs: its identity and pages, Fumadocs' collections (committed), the docs Worker's settings; the Worker's code is the package's |
| `packages/<name>/` with `README.md` (and `CHANGELOG.md`, Changesets') | pnpm, Changesets | packages the repo publishes, if any |
| `messages/`, `project.inlang/` | the app preset, the app's `generate` task, `remy i18n` | the app's own strings, if any (compiled into `src/paraglide/`) |
| `.plans/` (`now.md`, `done/`, `parked/`) | `remy plans` | the repo's plans |
| `AGENTS.md`, `.mcp.json`, `.codex/config.toml`, `.github/workflows/` | agents; Claude and Codex; GitHub | the agents' pointer at the docs; the MCP servers; CI |
| `packages/remy-cli/src/`, `template/`, `fixtures/consumer/` | the package; `giget`; `vp run new-app` | remy-auth only: the command line itself, the blank app a new repo starts from, and the consumer fixture that tests both as another repo gets them |

### A new consumer

The one recipe. A new app starts from the blank app, [`template/`](https://github.com/joeblew999/remy-auth/tree/main/template)
in remy-auth at the release tag: the layout above with only the repo's own files in it (its names, one
home page in every language, a docs index per site, the layout's config files at a few lines each).
Everything else is the package, which one version bump upgrades.

1. Prerequisites: the machine's `vp` in managed mode ([developer tooling](./tooling.md#vite-plus-the-machines-vp-in-managed-mode)),
   Node 26, `gh auth login` with a token that has `read:packages`, and on Linux the font `fonts-noto-cjk` (the browser checks install Playwright's own Chromium).
2. `vpx giget@3.3.1 gh:joeblew999/remy-auth/template#vX.Y.Z <name>`, then `cd <name>` and `git init`
   (the translation and plans tools read git history; `vp run setup` says so if it is missing).
3. Name the app: replace `my-app` and `My app` (`grep -rn -i "my.app" --exclude-dir=node_modules .`):
   `package.json`, `wrangler.jsonc`, `src/service.ts`, `.env`'s origins, `docs/wrangler.jsonc`,
   `docs/docs.config.ts` (the product's name and source, which the app's frame reads too) and `messages/en.json`.
4. GitHub Packages' token into this machine's pnpm configuration, once (pnpm reads no token from a repository's
   `.npmrc`, which only names the registry): `pnpm config set --location user //npm.pkg.github.com/:_authToken "$(gh auth token)"`.
   Then `vp install` once to write `pnpm-lock.yaml`, then `vp run setup` (the token again, the install, the pinned
   skills from `skills-lock.json` and the `remy` skill from the package, the `AGENTS.md` rules block, then
   `vp run ready`).
5. Commit everything, `pnpm-lock.yaml`, `skills-lock.json` and `src/routeTree.gen.ts` included. The
   blank app's strings come translated; after the English changes (`messages/en.json`, the docs), run
   `vp run translate`, which writes the other languages (it never commits: commit them with the rest); from then on
   it runs before every commit that changes text.
6. Deploying is a push: connect the repository to Cloudflare's Git builds, one per Worker (the app at the root, the
   docs at `docs/`), with remy-auth's build settings ([on Cloudflare](./run-and-test.md#on-cloudflare); `remy upgrade`
   prints the build command). Creating the databases and secrets a binding names is the owner's
   (`pnpm remy cloudflare provisioned` says what is missing). From then on work goes through
   [the flow](./how-we-work.md#the-flow-the-standard-way-in-plain-sight): every finished change is pushed to `main`,
   and every push to `main` deploys.
7. CI: `.github/workflows/ci.yml` calls remy-auth's shared workflow at the same tag. Grant the new repository read
   access in the `@joeblew999/remy-ui` and `@joeblew999/remy-cli` packages' settings ("Manage Actions access"), or
   its install fails there.

Then the app grows in its own files: pages in `src/routes/` (a page beside a parent's path, such as
`videos.$videoId` next to `videos`, is `videos_.$videoId.tsx`: TanStack nests `videos.$videoId` inside
`videos`, which then needs an `<Outlet />`), their links in `src/remy-app.tsx`, strings in `messages/en.json`
(`m` from `src/paraglide/messages.js`), an API as a contract package and `src/api/` (every procedure that
takes input documents an error, or `apiChecks` fails: the package's `api/coverage` rule), docs in
`docs/content/`. Move to a new release with `vp run upgrade <version>`: `@joeblew999/remy-ui` and
`@joeblew999/remy-cli` at that version (`vp add`), the CI workflow's tag, the blank app's scripts, `.vite-hooks/` and
`vite.config.ts` files (an old one kept as `vite.config.ts.before-upgrade`, to move its own plugins and options
back), `pnpm-workspace.yaml`, the docs' `collections.ts` and `wrangler.jsonc` where the app has none,
an old `remy.config.ts`'s origins moved into `.env` and the file removed; it prints Cloudflare's build command, which
lives on Cloudflare, and ends by saying to run `vp run setup` (the skills, the rules, every check), which it does not
run itself. An app on 0.15.1 installs the two packages at the new
version by hand first, since 0.15.1's upgrade cannot. Two local browser runs at once share `PREVIEW_PORT` and the second fails to
start its server: give each shell its own (`PREVIEW_PORT=4232 vp run …`).

### A repository that publishes packages

A repository may also publish packages of its own (a contract, a UI package), as remy-auth does; that
costs no command of ours: it is [Changesets](https://github.com/changesets/changesets) (`@changesets/cli`, configured
in `.changeset/config.json`). Its packages are the workspace's (`packages/<name>/`, listed in
`pnpm-workspace.yaml`), and each one that is not `private` is published by `changeset publish` (pnpm's publish, which
writes each `catalog:` and `workspace:` version in). A change to a published package carries a changeset:
`pnpm changeset` asks which packages and how far (patch, minor, major) and writes `.changeset/<name>.md`, committed
with the change. remy-auth's `config.json` makes remy-ui and remy-cli one `fixed` group, always released under one
version; the showcase and the contract version on their own. At a release, `changeset version` turns the pending
changesets into the new versions and each package's `CHANGELOG.md` section. To try a checkout's packages elsewhere,
`pnpm -r pack` (or `pnpm pack` in one package) makes the tarball the publish would.

A package's `exports` name every subpath its users import (`"./video": "./src/video.ts"`);
anything else is refused at build time and in Playwright, whose message names the importing file, not the
export map. A package's own strings are its own inlang project, compiled by its build, whose runtime
follows the platform's language with one call, `followLocale(runtime)` (`locale`); the translation tools find
the repository's inlang project through git. Checks the repository adds to a release are steps of its own `release`
script, after `vp run ci` (remy-auth: `vp run ui:verify`). remy-auth's `scripts/version.ts`, run after
`changeset version`, re-pins the blank app to remy-ui's new version (`template/pnpm-workspace.yaml`'s catalog and
`template/.github/workflows/ci.yml`'s tag), then the lockfile.

### Choosing the version: released, development or local

remy-auth's `vp run release` versions the packages from their changesets, checks, commits ("Release vX.Y.Z") and
tags the commit `vX.Y.Z` (`vp run release:tag`, which pushes main and the tag); GitHub's release job then publishes
`@joeblew999/remy-ui` X.Y.Z and the command line beside it, `@joeblew999/remy-cli` (the `remy` and `remy-check`
commands), always the same version, with the showcase and the contract when a changeset bumped them. Neither is
published in this form yet, and publishing is the release job's, never a cloud session's. A consumer pins both in
its catalog (`pnpm-workspace.yaml`, and its CI workflow's tag), and `vp run upgrade X.Y.Z` moves them, with the
scripts, hooks and configuration of the blank app at that tag. To try remy-auth's own checkout in an app, do what
the new-app test does: `pnpm pack` the packages in remy-auth (`pnpm -r pack` for all of them) and point the app's catalog and overrides at the
tarballs (`file:./vendor/remy-ui.tgz`).

Each package lists what it imports, at the catalog's version (`catalog:`): an app's `package.json` names the two
platform packages, the framework packages its own files import, the tools its tasks call (Wrangler, Playwright,
Vite Plus), its own packages and whatever its product adds. The tools the shared tasks run are remy-cli's
dependencies. A package that breaks when installed twice (React, TanStack Router and Query, the MDX stringifier)
has one copy through `pnpm-workspace.yaml`'s `overrides`, at the catalog's version: pnpm itself keeps it to one. An app's own preparation is a task in its own `vite.config.ts`: a `local` task (the local state it needs before it runs, which its
`dev` and `build` name first; remy-auth writes its `.dev.vars` and migrates its local D1 there) and its `generate`
(its own catalog, `project.inlang`, compiled with the Worker's types). Its own release checks are steps of its
`release` script.

The flow is the scripts and Vite Plus's tasks; each step, and who runs it: [how we work](./how-we-work.md#the-flow-the-standard-way-in-plain-sight); every command: [Commands](./commands.mdx).

`vp run release` runs, after `vp run ci`, remy-auth's new-app test
(`vp run new-app`, `fixtures/consumer/run.sh`; not in `vp run ci`, so a push does not wait for it): the other repositories this one serves, tested as they get it. It
copies `template/` to a scratch folder and lays `fixtures/consumer/files` over it (finished files: a package the app
owns, its API and a showcase part; a unit check holds them to the blank app's), packs remy-ui, remy-cli and the
showcase into its `vendor/` with `pnpm pack` (each with a version no registry has), then installs and runs the
skills (`skills experimental_install` and `experimental_sync`, once per `skills-lock.json`, then reused), the
`wrangler.jsonc` check (`remy-check wrangler`), the app's `vp run ready`, the quick
browser checks and the docs' checks (about 93 s); Vite Plus caches it on what a new app is made of, so a change to
remy-auth's own app or product docs runs it no more.
A change that would break another repository fails there, not in that repository. Tests are type-checked with
the app (`tsconfig.json` includes `tests/`). Google's audits are
`vp run test:audits` (Lighthouse, local; part of `vp run ci`, so of every push) and Core Web Vitals is
`pnpm remy test cwv` (on a deployment: production, or a branch's Preview), run by hand after a deploy.

Where checks run: the shared package's own behaviour is proven once, in remy-auth, before each
release. An app built on the package runs a contract set (its pages render, site and app pages stay
apart, its own features work) plus Google's level on its own site pages, not the whole package
suite again. Keep checks cheap rather than dropping them (Playwright's clock rather than real
waits, one browser page per check, parallel workers). Checks loop over `checkedLocales` from
`@joeblew999/remy-ui/checks`: one language per way the app draws text by default (the release's too: the other
languages draw through the same code, and every catalog is checked offline), `quick` for the base language and the first right-to-left one, or a comma-separated
list; the checks work the languages out themselves, so no command names them ([which and why](./run-and-test.md)). Every step says how long it took.

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
(`packages/remy-cli/src/i18n.ts`, `translate.ts`: `remy i18n check`, `remy i18n translate`); the
`check:translations` task and the `translate` script run them.

- **UI messages** (Paraglide): the catalogs, locales and base locale come from inlang's own
  `settings.json` (the one project git knows). Detected (`packages/remy-cli/src/i18n.ts`): missing catalogs and
  keys, lost or invented `{placeholders}`, keys whose English differs from the catalog's record
  (`translated-from/<locale>.json` beside it), plural categories the locale needs (`Intl.PluralRules`: no upstream
  tool checks them).
- **Docs** (Fumadocs): the folder is the docs package's `content/` (`docs/content`, or `apps/remy-auth-docs/content` in remy-auth); each site with an
  `i18n.json` translates every English page into each of its languages. Detected: missing pages, stale
  ones (their `translatedFrom` frontmatter: a fingerprint per English section), orphans, and Fumadocs UI's own text (`ui/<lang>.json` against `ui/en.json`).
- **The translator** is the machine's Claude Code headless (`claude -p`), with no tools, no MCP
  servers, skills or project settings, and structured output: a catalog's keys come back as JSON and
  are merged in English key order; a stale page's changed sections come back and are spliced in (a page that no longer lines up with its
  record, or a missing one, comes back whole), and it is written only when it is a page (`page.ts`). The prompts are `packages/remy-cli/src/prompts.ts`. One call per language (messages) or per
  page (docs), eight at a time (`--jobs`).
- Checks need no key, no network and no git history (a shallow clone gives the same answer). Translating
  uses the Claude login on the machine.
- An app with no inlang project and no docs sites gets "nothing to check" and exit 0.

The two commands, `pnpm remy i18n check` and `pnpm remy i18n translate`, with their options: [Commands](./commands.mdx).


### Cloudflare

Every `pnpm remy cloudflare …` command, and `pnpm remy test remote`, `pnpm remy observe` and `pnpm remy upgrade`, with what each does and refuses: [Commands](./commands.mdx). Each says in its header comment whether it is local or remote (and production).

Credentials come from Wrangler's login, or from the keychain through fnox
([tooling](./tooling.md#secrets-fnox)).

### Plans

The plans rule ([how we work](./how-we-work.md#plans-few-short-closed)) as commands (`pnpm remy plans …`), the same in
every project: `.plans/now.md` is the one ordered list, `.plans/*.md` the few open plan files,
`.plans/done/` and `.plans/parked/` the rest, `.plans/stability-log.md` optional. A project with no
`.plans/` passes `plans check` and has nothing to list.

The commands, with what each does, are on [Commands](./commands.mdx).

`close` and `park` change files and stage the move but never commit: read `git diff`, then `vp run ready`.
