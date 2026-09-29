# Platform structure: fix what makes every change to the shared platform so hard

Status: agreed 2026-09-29; the owner delegated its decisions ("Stop asking me and use your brain"), recorded
under "Decisions". Fix 1 and the tests half of fix 3 first. Owner: remy-auth.
Executor/Reviewer roles as in [plans and roles](../docs/content/dev/development.md#plans-and-roles).

Owner, 2026-09-29, after thin-apps phase C: "you are finding so many structural problems. I expect a plan
after this to fix the structural problems that make this so fucking hard !!"

## What went wrong, and why it keeps happening

[thin-apps](thin-apps.md) phases 0 to C found about twenty problems. Almost all of them were found late,
by a hand-built scratch app or by the reviewer, never by remy-auth's own gates. They are not twenty
separate bugs: each one traces back to one of five structural causes.

| # | Cause | What it produced (thin-apps, 2026-09-29) |
| --- | --- | --- |
| S1 | **remy-auth cannot see what another repo sees.** It uses the package through a workspace symlink, its tasks from a local path, with no `.npmrc` and no GitHub Packages. Every other repo gets a copy in `node_modules`, tasks from mise's cache and a token-reading `.npmrc`. Tools behave differently on each side of that line, and remy-auth's gates only ever run on its own side. | Route-typing errors in `node_modules` (A6); duplicate `query-core` (A5); TypeScript not stripped under `node_modules` (phase B); `verify-tooling` resolving its imports from mise's cache; devtools stripped only outside `node_modules`; the `.npmrc` token beating `packages:publish` (the blocking review issue); `app-catalog.js`'s guard under a symlink; a missing `parts.json`; a missing route tree; the scratch tarball losing to the published 0.13.0 of the same version |
| S2 | **The package is two things:** the platform, and remy-auth's own product (the showcase pages, their copy in the shared catalog, `HomePage`, `paths.js`). remy-auth's product leaks into every app as defaults. | Hardcoded routes (A6); the home-page copy in `publicPageChecks` (A12); remy-auth's page lists as defaults (phase C, group 5); 'Remy' as the default brand; the `/formats` device-time check in every app; a blank page failing the Arabic font check with no strings of its own |
| S3 | **Types stop at the seams.** Tests are outside every `tsconfig`. Build-time modules are JavaScript with hand-written `.d.ts` beside them. Options change in `.js` while the `.d.ts` and the callers keep the old names. | remy-auth-app's `prerenderedAppChecks({ service })` still type-checked after the options changed; `buildBoundaryChecks`' `.d.ts` lagged its `.js`; stale options in the CHANGELOG, found only by reading |
| S4 | **Task logic is shell inside TOML inside mise's cache.** bash 3.2 on macOS against bash 5 in CI; TOML quoting; a file task cannot find a sibling file in the include cache; nothing tests a script except running the whole pipeline. | `ncu.sh` crashing under bash 3.2's `set -u`; `template:check` broken by quoting on its first run; bash wrappers existing only to find sibling files; the release path (`packages:tag`, `packages:publish`, the CI release job) untestable before a real tag |
| S5 | **The same fact lives in several places with nothing checking them.** Also, changes pile up unreleased, so other repos meet them all at once. | The template's version in three places (a check had to be added); the 13 languages copied into the template's catalog (parked); the dependency list copied into remy-auth-app (A3); 0.14.0 carrying the breaking changes of three phases; remy-auth-app four edits behind with nothing telling it |

## The fixes, in order

Each fix closes a cause, and closing one means the problems in its row can no longer happen unnoticed.
The order follows what a fix catches: S1 first, because once it is closed, remy-auth's own gates find
the rest.

### 1. Close the gap: remy-auth's gates run a real other repo (S1)

- **One fixture, run on every change, not only at release.** `template:test` (added in phase C, currently
  a release check) moves to tier 3 and CI, so every push to main runs the blank app as another repo would.
- **The fixture sees what another repo sees:**
  - the package from a tarball with its own prerelease version (`0.14.0-dev.<sha>`), so npm can never
    substitute a published copy;
  - the tasks through mise's git include from a local bare clone (`git::file://…`), so they run from
    mise's cache as they do elsewhere;
  - the template's `.npmrc`, which `packages:publish`'s token check and registry lookups go through. (An
    install from GitHub Packages itself is not done: the fixture's package comes from a tarball, its contract
    is a workspace.)
- **The template grows the shape of a real app**: one site page, one app page and one procedure in a
  contract workspace, as phase C's scratch check had. It then also covers the API, the reference docs and
  package publishing (through `packages:publish --dry-run`, fix 4).
- **Measured**: every problem in S1's row gets a check in the fixture that fails without its fix. The
  change is proved by reverting each fix and watching the fixture fail.
- Decide (owner, below): whether remy-auth also stops using the workspace symlink for its own app.

### 2. One job per package (S2)

- `@joeblew999/remy-ui` holds the platform only: frame, providers, root, router, checks, tasks' tools,
  the docs Worker, and the strings of the frame and the problem pages.
- The showcase goes elsewhere: its pages, their strings, `paths.js`, `HomePage`, the formats rows, the
  clock, the demo, the showcase checks, `showcase/app-nav`. The owner picks where (below).
- Proof: grepping the platform package finds no showcase route, word or check. remy-auth passes every
  gate it passes today, with the showcase coming in through its config.

### 3. Types across every seam (S3)

- Tests type-check: `tests/` in the app's `tsconfig`, in remy-auth, in the template and in every app.
  `project:typecheck` covers them.
- Build-time modules are written once, in TypeScript, and the package ships compiled JavaScript with
  generated declarations (a build step at pack, never committed). No hand-written `.d.ts` beside a `.js`.
  Tool choice by survey first: `tsc` emit, tsdown or unbuild (how-we-work, "choose tools by survey").
- Proof: changing a check option's name fails `project:typecheck` in remy-auth and in the fixture.

### 4. Task logic in one tested program (S4)

- Unpark [remy-cli](parked/remy-cli.md): one `remy` binary in the package. Every task becomes a one-line
  TOML `run` with a usage spec, calling it. No bash beyond one-liners, no sibling-file lookups, and the
  same Node on the Mac and in CI.
- The CLI has its own unit tests (`node:test`) run in tier 0, and a `--dry-run` for every outward step
  (tag, publish, GitHub release, deploy), so the release path runs in CI on every push, not first on a tag.
- Order inside: the release and publish path first (the one proved only by releasing), then the
  `project:*` preconditions and tooling, then the rest by the parked plan's inventory.

### 5. One home per fact, small releases (S5)

- **Derived, not copied:**
  - the template's version pins are written by `packages:tag` at release, not by hand;
  - an app's language list comes from the package (the app's inlang settings are generated, or checked
    equal in `i18n:messages:check`);
  - the dependency set stays the package's own (done in thin-apps group 3).
- **A release per finished piece of work**, not one per plan: each fix above ends with a patch or minor
  release and `remy-auth-test` upgraded to it the same day (`project:upgrade-ui`), so no repo is ever more
  than one release behind.
- **Other repos hear about releases:** a survey of Renovate against a scheduled `project:upgrade-ui` in
  each repo's CI, which opens a pull request when a release appears.

## Acceptance

- Every problem in the table above has a named check that fails without its fix, and each fix is proved
  by reverting it.
- A change to the package or the tasks that would break another repo fails remy-auth's tier 3 or CI.
  It is not found by hand.
- `remy-auth-test` stays on the latest release throughout.
- The Reviewer's acceptance per fix, as in thin-apps.

## Relation to thin-apps

Thin-apps phase D (release 0.14.0, `remy-auth-test`) comes first. This plan starts from 0.14.0, and
`remy-auth-test` is fix 5's canary. Fix 1 can start before phase D, since it changes only remy-auth's
own gates.

## Decisions (the Executor's, owner delegated, 2026-09-29)

1. **The showcase becomes a second package in remy-auth's workspace, `@joeblew999/remy-showcase`** (fix 2).
   It keeps both answers to the open remy-auth-app question possible (a prerendered showcase needs the pages
   from a package), and it makes remy-auth a repository that owns two packages, the case group 6 of
   thin-apps built tasks for and nothing yet exercises.
2. **remy-auth keeps the workspace symlink for its own app; the fixture closes the gap** (fix 1). A pack
   per change would slow every edit to the package by a pack and an install; the fixture sees everything
   the symlink hides, on every tier 3 and CI run. Revisit only if a problem the fixture should see gets past it.
3. **remy-cli is unparked, scoped** (fix 4): the release and publish path first, since it is the one path
   proved only by releasing; the rest by the parked plan's inventory after.

Found while starting fix 1: mise (2026.9.15) has no `git::file://` include (it loads nothing, silently), so
the fixture cannot take the tasks through mise's git cache. What differs there is where the files sit: no
`node_modules` above them. The fixture takes a copy of `tasks/` in a temporary folder outside any
`node_modules`, which is that same condition (the phase C `verify-tooling` problem shows under it).

## Progress

- **Fix 1: done 2026-09-29.** `template:test` is the consumer fixture (`fixtures/consumer/`: its README, `run.sh`, and
  `files/`, new files only). It builds the blank app plus a contract package it owns and an API, with the package from a
  tarball versioned `X.Y.Z-dev.<sha>`, the tasks from a copy outside any `node_modules`, and the template's `.npmrc`.
  It runs install, skills (installed once per pinned list, then reused), `project:verify-tooling`, tier 0, tier 3,
  `docs:test` and `packages:publish --dry-run` without `GITHUB_TOKEN`, as a release does. `project:test:consumers` (a
  shared hook, no-op by default) runs it last in tiers 3 and 4 and in CI. Proved by undoing two fixes, each failing
  the fixture:
  - the token export: `packages:publish` now checks `npm whoami` first. A registry answers "not found" for a new name
    whatever the token, so only `whoami` shows a refused one, and the first proof passed until that check was added;
  - `verify-tooling`'s resolution from the app: `Cannot find package 'smol-toml'`. The old `template:test`, with
    remy-auth's own `tasks/`, passed.

  The rest of S1's row is covered by construction: no parts list, the route tree, devtools stripping, an app's own
  catalog, the version substitution. Acceptance's "each proved by reverting" is met for those two only. It costs
  ~1.5 to 3 min in tier 3, mostly network. The fixture runs with remy-auth's own `[env]` unset. The first
  review found that CI would fail at the dry-run publish (no token without `gh`'s login); the step now
  passes the token as the release job does. Found: mise has no
  `git::file://` include (decision note above).
- **Fix 3, first half: done 2026-09-29.** Tests are type-checked (`tsconfig.json` includes `tests/`, in remy-auth and
  the blank app, whose tier 0 the fixture runs). It found one seam error at once: `HomeContent` took `string` where the
  messages take a `Locale`. Left: the build-time modules in TypeScript with generated declarations (survey first).

- **Fix 5, the copied facts: done 2026-09-29.**
  - The languages: `i18n:messages:check` fails when an app's catalog lists other languages than the platform
    serves (the platform's list has one home, its compiled runtime). Tried on a copy with German dropped and
    French added: both reported.
  - The version: `ui:version -- X.Y.Z` writes the package's version and the blank app's three pins together, so
    the template always pins the package's version (0.13.0 on main again, not the unreleased 0.14.0), and
    `template:check` holds on every commit.
  - Left: small releases and other repos hearing about them (a survey), and `release-0.14.0` remade with
    `ui:version -- 0.14.0`.
  - The parked thin-apps item (the language list) is closed by this.

- **Fix 1 in CI: passed 2026-09-29** ([run](https://github.com/joeblew999/remy-auth/actions/runs/36545147647)).
  `project:test:consumers` ran the fixture on the runner, and `npm whoami` against GitHub Packages accepted the
  Actions token (the reviewer's open question, before the first real tag).
- **Fix 2 is staged.** It turned out more tangled than planned: three of the four parts (time-zones,
  deferred-place, status-card) are showcase features built on showcase modules, and the platform's check sets
  called showcase checks.
  1. **The dependency direction: done 2026-09-29.** No platform check set calls a showcase check. The demo,
     formats and app-navigation checks left `checks.js` for `showcase/showcase.checks.js`, whose
     `showcaseChecks({ rendering, formats, devicePath, network })` an app showing the showcase calls itself.
     `serverAppChecks` and `prerenderedAppChecks` lost `showcase`. `problem.checks` (the problem pages,
     which the parts use) moved from `showcase/` to the platform's root. remy-auth runs the same 313 checks as
     before, identical by name (the lists diffed).
  2. **The move: done 2026-09-29, except the parts.** `@joeblew999/remy-showcase` (`packages/showcase`, a
     workspace remy-auth publishes with the platform) holds the showcase's pages, navigation, clock route, demo
     reservation, search params, leave guard, page lists and checks, importing the platform only through its
     exports; the platform imports nothing of it (checked). The pieces the parts are built on moved into their
     parts. remy-auth runs the same 313 checks (the lists diffed), and the fixture's blank app, which installs
     no showcase, passes. Done with a one-off move script (renames plus import rewriting); its three misses
     (imports of a file that had itself moved, the `showcase/*` wildcard, `/// <reference>` paths) were found by
     tier 0 and fixed.
     The review found what S5 predicts: the contract changed (its reservation now comes from the showcase)
     but kept version 0.2.1, which `packages:publish` would have skipped as published, leaving 0.2.1, whose
     import 0.14.0 removes, as the only contract. Fixed: the contract is 0.3.0, and `packages:bumped` (first
     in `packages:release`, and in `packages:tag`) stops a release when a published package's files changed
     since the last tag without a new version; run now, it names exactly that case. The showcase is a peer of
     nothing but the platform; the docs' old export names (which also ship in the `remy` skill) are fixed.
  2b. **Left: the three showcase parts.** time-zones and deferred-place still link to and default to the
     showcase's `/formats` and `/app/demo`, and status-card shows remy-auth's API, so they belong to the
     showcase. The parts catalog (`parts/list.js`) is written inside the platform, so it has to take parts from
     another package first: each package lists its own parts, and `remyParts()` reads the catalogs of the
     packages the app names.
  3. **The strings:** the showcase's keys (122 used only by showcase code, and the ones only remy-auth's
     `src/` uses) move to the showcase's own catalog in the same commit as every language, following the
     platform with `followLocale`.

## Open questions for the owner (answered above)

1. **Where does the showcase go (fix 2)?** Options:
   - into remy-auth's own `src/` (remy-auth is the only repo showing it once remy-auth-app is decided);
   - a second package, `@joeblew999/remy-showcase`, if remy-auth-app stays as the prerendered example.

   This ties to the open remy-auth-app question.
2. **Does remy-auth drop the workspace symlink for its app (fix 1)?** Then it consumes its own packed
   package on every build, like everyone else: slower (a pack per change), but no gap at all. The
   alternative is the fixture alone.
3. **Unpark remy-cli (fix 4)?** It was parked 2026-09-26 to get back to normal. S4 is its reason to return.
