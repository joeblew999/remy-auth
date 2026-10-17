# 2026-10-17-01-ci-local-and-fast.md

CI that is fast, and that runs the same locally as on GitHub. Everything the owner asked for on
2026-10-17, in one place, so no agent works from memory.

## What the owner asked for

- **Massively faster CI** (code PRs waited about 5.5 minutes; a docs-only PR ran three five-minute jobs).
- **CI runs locally exactly as on GitHub**: "the whole point is that we can run it locally and there".
  Locally means the owner's Mac **and** a cloud agent's container (Claude on iOS runs on Claude Code in
  the cloud, with no Docker). Same command, same answer.
- **One change, planned first**: no stream of PRs. Decide the design, say it, build and prove it
  locally, then send it through once both are happy.
- **Cloudflare Previews** of every branch and PR, throwaway, without GitHub secrets (done, #19), and
  a preview **straight from a local checkout** when wanted, without GitHub.
- **Work through a branch and PR**, never straight to main, and keep the PR mergeable.
- Logic lives in our own TypeScript tooling (`remy`), never in workflow YAML.

## The design

### One command: `npm run ci`

- `npm run ci` runs what a pull request runs: **types and unit, then level 1** (every browser check).
- `npm run ci -- --full` adds what runs after merge: **Google's audits and the consumer fixture**.
- `npm run ci -- <part>` runs one part (`check`, `every`, `google`, `consumers`); `--shard i/n` splits
  `every`; `--all` skips nothing.
- Each GitHub job is exactly `npm run ci -- <part>` after checkout, Node, caches and `npm ci`. A red
  job is reproduced by running its line. `remy verify tooling` already refuses a workflow that names a
  script `package.json` lacks.

### What runs when

| Event | Parts | Why |
| --- | --- | --- |
| Pull request, and `npm run ci` locally | check, every (3 shards on GitHub) | What a change usually breaks; about a minute per shard |
| Push to main, tag, `npm run ci -- --full` | all four | Google (about 2 min) and consumers (about 4 min) were the slowest jobs; a PR waits for its slowest job. `dev:promote` refuses a red main; a release runs them again |

On a PR, GitHub still starts the after-merge jobs (one workflow for every event); `ci` ends them at once.

### Skip what a change cannot affect

`packages/ui/src/cli/unchanged.ts` (unit-checked): plans, docs content and Markdown outside the packages
run nothing; the blank app and the fixture run only consumers; unknown paths run everything. On a PR
it compares the merge commit with its base parent; locally on a branch, with `origin/main`; on main,
with `--all` or on a push, nothing is skipped.

### Every language only when a change can differ by language (owner, 2026-10-17: "decide what's best and check it")

Measured: 174 of level 1's 247 checks (71% of its time) are the same checks per language. Level 1 runs in all
13 languages when what changed can differ by language (catalogs, fonts and CSS, locale code by name or by what it
calls, the browser checks, the lockfile, Node); otherwise English and Arabic, and says so. Checked against the
last 80 commits on main: 31 need no level 1, 37 run English and Arabic, 12 every language (mostly edits to checks).
A code change: `npm run ci` 1 min 39 s instead of 2 min 49 s. Every push to main runs everything, so a miss is
caught on main and dev:promote refuses it. Considered and not done: Playwright's `--only-changed` (it follows what
the test files import, and our checks import no app code, so it would pass app changes untested); choosing checks
per folder (half the time is platform-wide checks); coverage maps (precise, but costly to keep right). The manual
levels collapse: what runs is what the change can affect, everything after merge.

### Same browser and fonts everywhere, owned by `ci`

- **Playwright's pinned Chromium** (its headless shell) for every check, instead of the machine's Chrome;
  `ci` installs it when missing. Lighthouse and Core Web Vitals use the same pinned build.
- **Linux needs a Han font** (the app ships none for Japanese and Chinese, by design): `ci` installs Noto
  CJK where it may and stops with the fix where it cannot.
- **Checks test the app, not the machine.** The Han check used to measure which system font a browser
  picked, which changed with the OS, the installed fonts and the browser build. It now checks what the app
  controls: each page declares its language, and no web font of ours draws both Japanese and Chinese.

### Two separate things: CI, and the agent's browser

- **CI** (`npm run ci`): automated checks, the same on a Mac, in a cloud agent's container and on GitHub.
  Playwright's pinned Chromium; Lighthouse called directly (as Core Web Vitals always was). No Chrome
  DevTools CLI, no MCP, no daemon.
- **The agent's browser on a laptop** (Chrome DevTools MCP): for Claude Code on the owner's Mac to open
  pages and check things by hand. `npm run setup` registers it; `npm run browser` drives it. Not part of
  CI, and CI never depends on it.

### The consumer fixture (reviewed with the owner, 2026-10-17)

It proves a brand-new repo on the published package works: pack, a fresh install with no lockfile (the
only thing that catches what a new user hits, such as two copies of React), skills and `verify tooling`,
the app's `dev:change`, its browser and docs checks. All kept; it runs after merge. One change: the
publish rehearsal runs only when a release asks (`REMY_REHEARSE_PUBLISH`, set by `dev:release`), since only
a release has a token the registry accepts. It packs with `tar`, not `rsync` (a cloud container had none).
Not done, on purpose: reusing the first build for the browser checks (a stale build is what `/healthz`
guards against) and a timings file compared between runs (GitHub's jobs start fresh, so it could not be
the same everywhere).

### Timings come from the command line itself

Every `remy` command is timed by `remy.ts` (`timing.ts`), not by the command: a record per command
(`node_modules/.cache/remy/<command>-last.txt`, `npx remy last [command]`) with its start, parts and total.
A command started inside another writes into the outer record, indented, so one `npm run ci` leaves one
record of everything it ran; the consumer fixture's script and each translator call add their own times
to it. Commands only mark parts (`lap`). Where the time goes is read from the run, never remembered.

### Translation, in the change (owner, 2026-10-17: "it ended up taking bloody ages")

What was slow, from the code: a stale page was rewritten whole for a one-line change; translation ran on
main after the push, as a second commit and second push, so every landing that touched docs ran GitHub's
checks twice and the landing waited for it; staleness came from git history, so GitHub's shallow
checkout could not check it at all; one writer on main under a lock contradicted the branch-and-PR rule.

Now: each translation records what it was made from (a fingerprint per English section in a page's
`translatedFrom` frontmatter; `translated-from/<lang>.json` beside a catalog). Stale is the record against
the English, no git history, the same answer everywhere (checked in `npm run ci`'s check part, a warning;
strict at release). `dev:land` translates on the branch before the check, only the changed sections and
keys, into the same commit: one push. No lock, no one writer. Pages split at `##` and `###`. Measured on
2 stale Spanish pages: 66 s and ~28k tokens before, 20 s and ~8k after; a 1-section change took 2 s.

### Fewer repeats

- Checks of behaviour that does not depend on the language run in English and Arabic
  (`behaviourLocales`); language-dependent checks keep all 13.
- Checks that looped every language inside one test are one test per language, so they spread across
  workers.
- One browser per core under CI; the consumer fixture installs from the npm cache.

### Previews

- **Cloudflare Workers Builds** builds every branch and PR as a throwaway Preview and comments its URL
  (#19). Previews have their own D1 databases and secret.
- **Open, to come back to (owner, 2026-10-17):** one preview script used everywhere (Cloudflare's builds,
  a Mac, a cloud agent, GitHub). GitHub would need the Cloudflare secrets to run it; whether that is wanted
  is undecided. Not part of this change.

### The order a change goes in

1. `npm run dev:change` after every edit (seconds).
2. `npm run ci` when the work is done (the PR's answer, locally).
3. Optionally push the branch alone: Cloudflare builds a preview, and no GitHub checks run without a PR.
4. Push the branch, open the PR; GitHub and Cloudflare repeat what passed locally.
5. A `pre-push` hook installed by `npm run setup` runs `npm run ci` (to add), so step 2 cannot be skipped.

## Status

Done, on main:
- #19 Cloudflare Previews; #20 React 19.3.1 (consumers had failed on every PR since 2026-10-14);
  #21 change-based skipping, behaviour checks in two languages, one browser per core.

In this change (branch `claude/ci`, not pushed until the owner says):
- [x] `npm run ci` with parts, `--full`, `--shard`, `--all`, timings
- [x] Workflow: one `npm run ci -- <part>` per job; 3 shards; no font step; Chromium and skills cached
- [x] Pinned Chromium everywhere; Han font installed on Linux; the Han check tests the app, not the machine; the font check's stale-node race
- [x] Google and consumers after merge
- [x] More behaviour checks in two languages; per-language tests instead of loops
- [x] `pre-push` hook running `npm run ci`, installed by `npm run setup`
- [x] Lighthouse called directly (the Chrome DevTools CLI stays for agents on a laptop, not CI)
- [x] The workflow's job list held to ci's parts by a unit check (tests/unit/ci.unit.spec.ts)
- [x] The consumer fixture: tar not rsync, publish rehearsal only in a release, each step timed
- [x] Full local proof, cloud container, 2 cores: `npm run ci -- --full` green in 5 min 21 s (check 9 s,
      level 1 2 min 32 s for 247 tests, google 47 s, consumers 1 min 53 s)
- [x] One module for every skip: `unchanged.ts` (dev:change's stamps, ci's change rules, the state
      folder); the rule is in how-we-work
- [x] Locally, ci's change detection counts uncommitted and new files (it said "nothing changed" on a
      branch whose work was uncommitted, and skipped level 1)
- [x] Every `remy` command timed by the command line (`timing.ts`, `npx remy last`)
- [x] Level 1 in every language only when a change can differ by language; English and Arabic otherwise
- [x] `ci` refuses a Node other than `.node-version`
- [x] Translation in the change, by recorded fingerprints; section-only; records migrated once from git
      history with the stale state unchanged; proven on a copy with no history
- [ ] The owner reviews; then one PR, and measure the real job times

What a pull request waits for locally (`npm run ci`), 2 cores: about 10 s for docs only, 1 min 39 s for a code change, 2 min 49 s when it can differ by language; on GitHub, check and
level 1 in three parallel jobs.

## Next, after this change (decided, not started)

1. **The flow and the PR rule disagree**: `dev:land` fast-forwards main, the owner's rule is branch and
   PR. `dev:land` becomes: `npm run ci`, push the branch, open or update the PR, merge when green.
2. **Zero-JS site pages**: site pages still ship about 275 KB of JS. Recommended: keep the 321-byte
   inline theme script, drop the theme toggle from the site header, make "keep my language" a link to a
   server route, the device time zone only on `/app/formats`, and a check that a site page loads no JS
   file.
3. **Platform shape**: `remy-ui` as small libraries plus a template each app owns, instead of a
   framework that owns the app's build, root, router and docs app.
4. **Previews for the other repos**, and the `previews` block in the template.
5. Remaining `mise` references in older plans.
