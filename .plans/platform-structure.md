# Platform structure: fix what makes every change to the shared platform so hard

Status: proposed 2026-09-29, waiting for the owner's three decisions (end of this file). Owner: remy-auth.
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
  - the template's `.npmrc`, and a real GitHub Packages install when a token is present (CI has one).
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

## Open questions for the owner

1. **Where does the showcase go (fix 2)?** Options:
   - into remy-auth's own `src/` (remy-auth is the only repo showing it once remy-auth-app is decided);
   - a second package, `@joeblew999/remy-showcase`, if remy-auth-app stays as the prerendered example.

   This ties to the open remy-auth-app question.
2. **Does remy-auth drop the workspace symlink for its app (fix 1)?** Then it consumes its own packed
   package on every build, like everyone else: slower (a pack per change), but no gap at all. The
   alternative is the fixture alone.
3. **Unpark remy-cli (fix 4)?** It was parked 2026-09-26 to get back to normal. S4 is its reason to return.
