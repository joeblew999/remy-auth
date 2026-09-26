---
title: "How we work"
description: "How people and agents work here: project tools first, surveys before tool choices, shadcn and TanStack, gates, plans and translations."
---

This document owns how people and agents work: the habits the owner has asked for, for developers
and AI agents alike. What the code must be lives in [development principles](./development.md).

## Where rules live

- Write down how we work here, in the repository, not in an agent's private memory. Anyone
  opening the repository, person or agent, should find the same rules. Agent memory is only for
  things that concern one agent, never for how the project works.
- Each fact has one home, as [development principles](./development.md#development-principles)
  require; that applies to these rules too.

## Use the project's own tools first

- Start with `mise run project:setup`; [developer tooling](./tooling.md) says what it installs.
- Run commands through the mise tasks, check the real page with the Chrome DevTools tools
  (`browser:*` tasks), and use the installed skills before reading upstream sources, searching
  `node_modules` or writing one-off scripts.
- Look at the real page with the browser tools before writing a test for it.
- Once the tools can answer a question, stop researching and use them.
- Say how long a step will take before starting anything slower than a few seconds. Task
  descriptions (`mise tasks ls`) give each task's duration and what may run at the same time;
  run post-deploy checks in the background and keep working.

## Choose tools by survey, not by first find

Before a plan names a library or tool:

1. List the realistic candidates, including newer ones found on npm and GitHub.
2. Score them against fixed, weighted criteria, with a source for each score.
3. Name the runner-up and what would make us switch to it.
4. Prove the top two with small scratch builds.

Mark anything not checked as assumed.

## Once a tool is chosen, take its shape

Bend our system to the tool, not the tool to our system. Before building on a chosen framework:

1. Scaffold its own template and run its own generators (CLI features) in a scratch app.
2. Build it and request every route it makes; list what works and what does not.
3. Change our layout, files and what our code hands the GUI to match, keeping only what an owner rule
   requires (Paraglide's URLs, shadcn's UI).
4. Delete whatever of ours the tool already does. A custom plugin or wrapper has to justify itself
   against the stock way, not the other way round.

Owner, 2026-09-26, after the Fumadocs docs were found half-custom: "It's funny how you don't realise
until you're pushed!" ([the Fumadocs decision](https://github.com/joeblew999/remy-auth/blob/main/.plans/docs-for-consumers.md#decision-fumadocs-fully-2026-09-26)).

## UI: shadcn and TanStack all the way

UI is hard and never done, so we take what shadcn and TanStack have spent years getting right,
and write only what they do not provide.

- **shadcn's CLI writes every component and the theme.** Components come from `mise run ui:components`,
  the theme from `mise run ui:theme` (shadcn's default Nova style, neutral, Geist: no preset, no
  branding of our own). `mise run ui:verify` fails the release on any hand edit. The repository uses
  shadcn's monorepo layout, so `shadcn add` run in the app writes into the shared package.
- **Look for a shadcn block before building a layout or a screen:**
  `./node_modules/.bin/shadcn search @shadcn -t registry:block`. Add it with `shadcn add`, keep its
  structure, and replace only its sample data. Do not add constraints the block does not have (it is
  full width, so we are).
- **Compose, do not restyle.** Use variants and semantic tokens; follow the installed shadcn skill's
  rules (Separator, Skeleton, Badge, Empty, Alert, Field instead of hand-made equivalents).
- **Two kinds of page:** site pages for Google and app pages under `/app`, never mixed;
  [paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/src/paths.js) defines both.
- **Adopt the TanStack library instead of our own code** (Form, Router's Zod adapter, Table, Devtools
  and so on), install its agent skills, then delete the code it replaces.
- Before writing any UI code, ask: does shadcn, TanStack or Paraglide already do this? If yes, use it.

- Look at it: before calling UI work done, screenshot the pages you changed with `mise run browser:shots` (desktop and
  phone, light and dark, English and Arabic) and look at the screenshots. Checks prove behaviour; only
  the screenshots show layout, spacing, overflow and mixed-direction text; name the pages you changed
  (`mise run browser:shots -- /formats --phone`), `--all` only for a sweep (owner, 2026-09-26: "It's
  really depressing how you can't see the look of the web site properly").

### Which TanStack library for what

Checked against [tanstack.com](https://tanstack.com) on 2026-09-26. Beta and alpha libraries change
fast: read their current docs and installed skills before using them, not an agent's memory.

| Library | Status here | Rule |
| --- | --- | --- |
| Start, Router, Query | In use everywhere | The app, its pages and all data fetching (with oRPC) |
| Form | In use: the reservation form only | Every form uses it (login, signup, settings); no hand-rolled form state |
| Pacer | Not in use (the docs search is Fumadocs') | Any debounce, throttle, rate limit or queue in the browser |
| Devtools | In use in development | Keep the Router, Query and Form panels in the one Devtools |
| Table | Next: with the admin screens | Every list with sorting, filtering or paging, through shadcn's data table |
| Virtual | When a list gets long | Lists of hundreds of rows, starting with the time zones |
| DB (beta) | Not yet | Only if we need offline use or live sync; Query covers today's needs |
| AI (beta) | Not used | The docs' Ask AI is Fumadocs' panel on the AI SDK ([docs in your AI tools](./ai-tools.md)) |
| Hotkeys (alpha) | Not yet | Candidate for a search shortcut once it leaves alpha |
| Store (alpha), Charts | Not needed | No app-wide client state and no dashboards yet |

Moving a library from "Not yet" to in use follows [choose tools by survey](#choose-tools-by-survey-not-by-first-find).

## Language: Paraglide owns it

Paraglide owns all language behaviour: which language a request gets, through its strategies
`url`, `cookie`, `preferredLanguage` and `baseLocale` (set in
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/paraglide.mjs)), and the localized links, with TanStack Router
carrying them. We do not write framework-neutral layers or our own language code; when Paraglide
lacks something, use its options first and record the gap in the owning plan.

## Translations: one writer

English is the source; translations follow it, written by one writer at a time. Agents change these
files all the time, so translating inside every feature branch collides and leaves languages
half-updated.

- A feature agent writes English only: the English docs and the base catalog (`messages/en.json`).
  It never edits a translation (`<page>.<lang>.md` in `docs/content`) or another locale's catalog.
- Translation is its own step, serialized, on `main` after the merges: one translation agent runs
  `mise run i18n:status` (what is missing or stale), `mise run i18n:translate [locale]` (the exact
  English diffs and missing keys), translates, then records each docs file it finished with
  `mise run i18n:translate -- --mark <translated file>`.
- Stale or missing is a warning while pumping (`project:check` prints it) and an error at release
  (`ui:release` runs `i18n:check` with `I18N_STRICT=1` first).

The layout and the provenance line are in the [tasks README](./tasks.md#translations).

## Plans: few, short, closed

Owner, 2026-09-26: "how overwhelming and frustrating it is to have so much garbage plans". New work is
one line in `.plans/now.md`, in the order it closes. A plan file is written only for work that is big
enough to be parked or to run over weeks; research, analyses and reviews go into the plan they serve,
not a file of their own. A plan closes the day its work ships: a closing line, then `.plans/done/`. Big
features wait in `.plans/parked/`. Closing a plan needs no extra deploy or test run of its own: batch the
code into one deploy and one full run at the end.
The shared `plans:*` tasks do the moves: `plans:status` lists what is open, `plans:close` and `plans:park`
add the line, move the file and repoint every link, and `plans:check` (in tier 0) keeps `.plans/` tidy
([tasks](./tasks.md#plans)).

## When the owner delegates decisions

When the owner hands over decisions, for example to finish work unattended:

- Decide, and record each decision with its reasons in the plan that owns it.
- Keep every gate green; delegation never loosens a check.
- Leave a full report: what was decided, what was done, what was checked and what was not.

## Gates before anything leaves the machine

- The full gate (`mise run project:verify`, every language) is for real releases: `ui:release`
  runs it, and a tag or package release never goes out without it. Owner, 2026-09-25: "It's just
  only needed for real releases, we can't take forever in development. You have to start to use
  your judgement better on when a deploy needs a gateway test."
- Test tiers (owner, 2026-09-25: "do huge coding with no tests and then run through a different tier
  if there are issues"). Code freely with tier 0; move up only when something looks wrong or before
  something leaves the machine:

  | Tier | Command | What | Time |
  | --- | --- | --- | --- |
  | 0 | `mise run project:check` | typecheck and build; translation status as a warning | ~15 s |
  | 1 | `mise run project:test:smoke` | every page in en and ar answers; home and docs hydrate; search and ask respond | ~15 s |
  | 2 | `mise run project:test:only -- <words>` | only the checks whose title matches, en and ar | varies |
  | 3 | `mise run project:test:quick` | every check, en and ar | ~45 s |
  | 4 | `mise run project:verify` | everything, every language | releases |

- Deploys run no tests unless `GATE` picks a tier: `GATE=smoke` for most code changes, `GATE=quick`
  for shared-package or cross-cutting changes, `GATE=full` rarely. Docs text, plans, tasks and config
  deploy straight away. Say which tier ran when reporting.
- Never pipe a gating command through `grep` or `tail` in a chain: the pipe hides its exit code.
  This once released a version whose checks had failed.
- Report what was tested and what was not; never call untested work verified.

## Manual work becomes mise tasks over real tools

Owner, 2026-09-26: "You need to get to the point that your checking uses mise and the underlying tool!"
and "make sure you have something in docs about using your judgment about things that you do manually
being turned into a mise task that uses a tool ... It's vital because all our repos will be using this."

- Every check runs through a mise task that wraps the real tool: the test tiers (`project:test:*`,
  Playwright), `project:test:live` after a deploy, `plans:check`, `i18n:check`, `browser:shots` to look.
  No `curl` loops, one-off scripts or ad-hoc greps to decide whether something works: they cannot be
  repeated, apps on the package do not get them, and nobody sees them later.
- Use judgement on everything done by hand, not only checks: the second time you type the same commands
  or reach for a throwaway script, it becomes a shared task (in `tasks/`, so every app gets it) that calls
  the tool that does the job: Wrangler, Playwright, gh, npm, mise's own features.
- No tool found? Do not write a script and move on. Add a line to `.plans/now.md` to survey for one
  ([choose tools by survey](#choose-tools-by-survey-not-by-first-find)); if the search or the change is big,
  write a plan in `.plans/` (or `.plans/parked/`) yourself. Agents create these lines and plans as they
  meet such things; the owner does not have to ask.
- Scripts are the last resort, kept small and next to the task that runs them; where several tasks share
  logic, it moves toward one command-line tool ([parked: remy-cli](https://github.com/joeblew999/remy-auth/blob/main/.plans/parked/remy-cli.md)).

## Branches: short-lived, deleted after merge

- Work happens on branches in git worktrees (one per agent); they merge into `main` and are deleted, with
  their worktree, right after the merge. Only `main` and release tags are pushed; a branch goes to GitHub
  only for a pull request, and GitHub deletes it when the PR merges ("Automatically delete head
  branches", on for every repo, 2026-09-26).
- A leftover merged branch (local or on GitHub) is noise, not history: `main` and the tags hold it.

## Sharing one machine between agents

The machine crashed on 2026-09-25 with about ten agents building and testing at once (load 188),
and timing-sensitive checks failed well before that. So:

- An agent builds and tests only in its own git worktree, never in the main checkout: builds write
  `dist/`, and two builds in one checkout delete each other's files.
- Each agent sets its own `PREVIEW_PORT` from the shell (the repo's `mise.toml` reads it; never 4190,
  which browsers block).
- At most three agents run tests at the same time; research, writing and scratch spikes do not
  count. When more are needed, set `PLAYWRIGHT_WORKERS=2` for each.
- Google's level (`project:test:google`, `project:test:cwv`) takes a machine-wide lock, so a second
  run waits rather than skewing the first.
- `GATE=<tier> mise run cf:deploy` runs the tier itself; never chain a deploy after a gate with `;`.

## Reporting to the owner

- Every report about something the owner can look at gives its URLs: the live sites, the preview
  (`mise run cf:preview` prints it) and a direct link to each page or feature discussed.
- Say what was checked and what was not.

## Multi-agent work

When work splits into independent parts and the owner has asked for multi-agent orchestration,
use this shape:

1. **Spike first.** One agent proves the risky points and stops if it finds a blocker.
2. **One agent per part.** Each works in its own git worktree and uses its own port, so parts
   never collide.
3. **Each part proves itself.** Every part ships with its own shared check.
4. **One integrator.** It merges the parts into the working branch and runs level 1 and level 2.
   Nothing reaches `main` unless both pass.
5. **Hands-on pass.** Passing checks is not the end. Deploy a preview with `mise run cf:preview`
   and use each piece in a real Chrome, throttled to a mid-range phone, with a performance trace and screenshots.
   Write down how it feels: the wait before content, layout shifts, flashes, and anything
   annoying. Fix what feels bad before merging, even when its checks pass.
