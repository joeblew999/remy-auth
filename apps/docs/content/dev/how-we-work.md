---
title: "How we work"
description: "How people and agents work here: project tools first, surveys before tool choices, shadcn and TanStack, gates, plans and translations."
---

This document owns how people and agents work: the habits the owner has asked for, for developers
and AI agents alike. What the code must be lives in [development principles](./principles.md).

## Where rules live

- Write down how we work here, in the repository, not in an agent's private memory. Anyone
  opening the repository, person or agent, should find the same rules. Agent memory is only for
  things that concern one agent, never for how the project works.
- Each fact has one home, as [development principles](./principles.md#development-principles)
  require; that applies to these rules too.
- The root `AGENTS.md` and `CLAUDE.md` are pointers to [Agents: start here](./agents.md) and hold no
  rule of their own: `CLAUDE.md` is an `@import` of that page, so Claude Code loads it; `AGENTS.md`
  names it, for Codex and every other tool. A rule written into either is in the wrong place (owner,
  2026-10-10: "Agents.md and Claude.md in the root must just be a pointer to docs area for agents").

## See something: fix it, or write it down, in the same landing

Owner, 2026-10-09, after finding a gap each time he asked: "It's rather clear that the agent docs are
wrong if you're seeing issues and not acting on them and informing yourself and devs." So the rule
is general, not only for missing tools:

- An agent or developer who notices anything wrong, slow, missing or left over (a step that waits
  for nothing, a check nobody runs, a branch nobody owns, a doc that says what is no longer true) has
  two choices, both inside the landing they are on: **fix it** when it is small, or **write it into
  `.plans/now.md`** ("What is left, in order": what was seen, where, and what would fix it), a plan
  file when it is big. Mentioning it in a chat or a report alone is neither.
- **Everyone hears it through the repo**: `vp run status` prints that list to every session (agents
  open with it), so what one person saw reaches all, and the next landing takes the top of it.
- **"Done" is the end of a sweep, not of a list.** Before saying it: branches and worktrees, open
  pull requests, `remy cloudflare versions`, `remy plans check`, a search for the words the change retired, the docs
  the change touched. Show the sweep.

## Use the project's own tools first

- Start with `vp run setup`; [developer tooling](./tooling.md) says what it installs.
- Before doing any step by hand (installing, upgrading, releasing, deploying, translating), find its script:
  `vp run` lists them, in whichever repository you are in; an app has the same ones. Owner,
  2026-09-26, after an app was upgraded by hand past `vp run upgrade`: "you know we do not reinvent wheels".
- Run commands through the package.json scripts, check the real page with the Chrome DevTools tools
  (`npx chrome-devtools`), and use the installed skills before reading upstream sources, searching
  `node_modules` or writing one-off scripts.
- Look at the real page with the browser tools before writing a test for it.
- Once the tools can answer a question, stop researching and use them.
- Say how long a step will take before starting anything slower than a few seconds. Each command's
  header comment says its duration and what may run at the same time;
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

- **shadcn's CLI writes every component and the theme.** Components come from `vp run ui:components`,
  the theme from `vp run ui:theme` (shadcn's default Nova style, neutral, Geist: no preset, no
  branding of our own). `vp run ui:verify` fails the release on any hand edit. The repository uses
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

- Look at it: before calling UI work done, screenshot the pages you changed with `npx remy shots` (desktop and
  phone, light and dark, English and Arabic) and look at the screenshots. Checks prove behaviour; only
  the screenshots show layout, spacing, overflow and mixed-direction text; name the pages you changed
  (`npx remy shots /formats --phone`), `--all` only for a sweep (owner, 2026-09-26: "It's
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
| AI (beta) | Not used | The docs' Ask AI is its own page (`/docs/ask`, `/dev/ask`) built from Fumadocs' AI chat pieces on the AI SDK, not an overlay: one scroll, the question at the top ([docs in your AI tools](./ai-tools.md)) |
| Hotkeys (alpha) | Not yet | Candidate for a search shortcut once it leaves alpha |
| Store (alpha), Charts | Not needed | No app-wide client state and no dashboards yet |

Moving a library from "Not yet" to in use follows [choose tools by survey](#choose-tools-by-survey-not-by-first-find).

## The docs and the demo move with the code

remy-auth is what every other Remy repo builds on, and its developer docs are what their agents and
developers read (through the `remy` skill, generated from these pages). So a feature is done when
four things are true: it is in the package for every app, remy-auth's own app uses it where anyone
can see it work, a check fails when it is skipped, and the page that describes it is updated in the
same change. Owner, 2026-10-09: "By make Remy-auth reuses all its features in its own demo it makes it
easy to onboard AI and devs ... the docs are part of what any other agent and dev in other repos get."
A page that describes what the code no longer does is a bug; fix it where you find it.

## Language: Paraglide owns it

Paraglide owns all language behaviour: which language a request gets, through its strategies
`url`, `cookie`, `preferredLanguage` and `baseLocale` (set in
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/ui/paraglide.mjs)), and the localized links, with TanStack Router
carrying them. We do not write framework-neutral layers or our own language code; when Paraglide
lacks something, use its options first and record the gap in the owning plan.

## Translations: in the change

English is the source; translations follow it, in the same change. A pull request holds its English and
its translations together: one commit, one push, one run of the checks.

- A feature agent writes English only: the English docs and the base catalog (`messages/en.json`).
  It never edits a translation (`<page>.<lang>.md` beside its page) or another locale's catalog by hand.
- `vp run land` translates what the change made stale or missing, on the branch, before the check and
  the commit (`remy i18n translate`); nobody runs it by itself. The Claude agent translates exactly
  what `remy i18n check` lists: for a stale page, only the sections whose English changed; for a
  catalog, only the changed keys.
- **Each translation records what it was made from**: a translated page a fingerprint of each English
  section (`translatedFrom` in its frontmatter), a catalog a fingerprint of each English message
  (`translated-from/<lang>.json` beside it). Stale is where the record and the English differ. No git
  history is read, so the answer is the same on a Mac, in a cloud agent's container and in GitHub's
  shallow checkout, where `vp run ci` checks it too.
- Agents working at once need no lock and no one writer: each worktree translates its own change, and two
  branches that change the same English section already meet at that English; after merging main,
  `vp run land` translates again whatever the merge left stale. (Until 2026-10-17 translation ran on `main`
  after the push, under a lock, judged by git history: every landing that touched docs pushed main twice,
  ran GitHub's checks twice, and a page was rewritten whole for a one-line change.)
- The agent gets no tools: it is handed the English (and, for a stale page, the changed sections and
  their current translation) and returns text; the task writes the files it asked for, with their
  records, and nothing else.
- What the agent returns is written only when it is the page: every frontmatter field its English
  has, and text after it (`packages/ui/src/cli/page.ts`). A failed agent leaves the page as it was, says
  why and fails the translation; `vp run land` still lands the English, says the translation is still
  owed, and the next landing tries again. `tests/unit/i18n-docs.unit.spec.ts` holds every translated
  page in the repository to the same rule. On 2026-10-09 a failed agent's `null` was committed as a
  page and stopped the docs building on main.
- A translation that is not a page is deleted, never restored by hand: a missing page is translated
  from the English by the next landing.
- `remy i18n check` only reads, offline, so it is safe anywhere and in any number of worktrees.
  `remy i18n translate` is never a `depends`.
- Stale or missing is a warning while coding and in `vp run ci` (the check part), and an error at
  release (`vp run release` runs `remy i18n check` with `I18N_STRICT=1` first).
- A structural change (a rename, a sweep) that touches docs translations is followed by
  `REMY_FLOW=hand npx remy i18n translate docs <file>…`, which brings those files fully in line with the
  English. Change a catalog's structure (every locale's file) in the same commit as `en.json`.

The layout and the commands are in [projects](./projects.md#translations).

## Plans: few, short, closed

Owner, 2026-09-26: "how overwhelming and frustrating it is to have so much garbage plans". New work is
one line in `.plans/now.md`, in the order it closes. A plan file is written only for work that is big
enough to be parked or to run over weeks; research, analyses and reviews go into the plan they serve,
not a file of their own. A plan closes the day its work ships: a closing line, then `.plans/done/`. Big
features wait in `.plans/parked/`. Closing a plan needs no extra deploy or test run of its own: batch the
code into one deploy and one full run at the end.
The `remy plans` commands ([Commands](./commands.mdx)) do the moves and keep `.plans/` tidy; the check runs
`remy plans check` on every change ([projects](./projects.md#plans)).

## When the owner delegates decisions

When the owner hands over decisions, for example to finish work unattended:

- Decide, and record each decision with its reasons in the plan that owns it.
- Keep every gate green; delegation never loosens a check.
- Leave a full report: what was decided, what was done, what was checked and what was not.

## The flow: four steps, and a guard that refuses the rest

Owner, 2026-10-09: "95% of time has been checking and 5% coding. It can't go on", "It's a question of
what you run locally and what you run in GitHub asynchronously", and "The tooling formalises what
happens at development ... make sure the developer flow is also formalised so that this stupid
fuckups can't happen. And so you and developers use that same flow so that it's fixed forever." So
the flow is code, not a rule to remember: `packages/ui/src/cli/flow.ts` is the one place its decisions live.
Its four steps are `vp run check`, `vp run land`, `vp run promote` and `vp run release` (`flow.ts`'s `Step`,
and the check, Vite Plus's tasks); `vp run status` looks; a guard refuses what is not one of them. Five commands,
nothing else. A piece of work runs in a worktree of its own: Claude Code's (`.claude/worktrees/<name>`), or
`git worktree add` by hand; each worktree gets its own ports. remy-auth gets it the way every app does, from the shared
tasks; `vp run setup` installs the guard.

| Step | Command | Who runs it, and when | What runs | Time |
| --- | --- | --- | --- | --- |
| Look | `vp run status` | everyone, first: every agent session opens with it (a hook), a developer when they sit down | main's last commits with GitHub's verdict, what each deployment runs, every worktree ahead and behind main, translations, pull requests, the top of `.plans/now.md` | seconds |
| After every change | `vp run check` | whoever is coding; the only step waited for | Vite Plus's tasks (`vite.config.ts`): everything generated, the app and the docs built, the project's own checks (plans, single copies, the commands list, page endings, translation status, the plain-function checks in `tests/**/*.unit.spec.ts`), then `vp check` (format, lint, types); what has not changed comes from Vite Plus's cache | ~4 s unchanged, ~50 s from nothing |
| The change leaves the machine | `vp run land "<what changed>"` | whoever did the work, on their own, as soon as it is finished and the check is green | main merged in first (a conflict stops, naming the files), the translations it made stale (seconds), then `vp run ci` (the check, the browser checks, the audits, a new app; what nothing touched comes from the cache), one commit, push the branch, open its pull request (or update the open one), wait for GitHub's checks (they confirm what passed here), squash-merge, deploy staging, reset this checkout to the new main; a red check leaves the pull request open and names the job. GitHub is reached only through `packages/ui/src/cli/github.ts`, its REST API. Never straight to main; from main it moves the work to a branch of its own first. After the merge main's own run checks everything, every part in every language | a few minutes: the parts here, then GitHub's checks |
| Production | `vp run promote` | the owner, or an agent the owner asked in that session | `remy cloudflare deploy` and the docs Worker, from a pushed main, no gate: staging and GitHub already ran the checks | ~1 min |
| A release | `vp run release` | the owner, or an agent the owner asked in that session | on a clean main, the translations complete and every changed package bumped; `vp run ci` with the publish rehearsed; then `remy packages release`: the repository's `release-checks` script, Core Web Vitals on a throwaway Worker, the tag (GitHub publishes from it) | ~5 min |

- **Who runs a step is in the table, and it is never a question.** An agent lands its own finished
  work without asking: staging is part of landing, GitHub checks every landing, and nothing reaches
  production by it. The owner's word is for production and a release, the two steps whose column says
  so, and for provisioning ([development principles](./principles.md#development-principles)). An agent that
  reads the table and still asks whether to land has stopped using the flow (owner, 2026-10-10,
  after one did: "Is it absolutely clear when each should be run by you?").

- One area that looks wrong: `vp run test:browser --grep <words>` (the browser checks whose title
  matches, en and ar, ~30 s). It is the only browser run a step does not own.
- **The guard** (`remy guard`, a Claude Code hook on every shell command an agent runs, registered on each machine
  by `vp run setup`) refuses what costs more than time outside the flow (`remy i18n translate`, which spends Claude's tokens, and
  Core Web Vitals, which make a throwaway Worker on Cloudflare) and raw `wrangler dev`, naming what to run instead
  (`COMMANDS.md`); everything else is a Vite Plus task its cache makes cheap to rerun, so nothing refuses it
  (`flow.ts`'s `heavy`). Each still runs by hand from a terminal, with `REMY_FLOW=hand` in
  front (`REMY_FLOW=hand npx remy test cwv`): the command itself
  asks who is running it (the gate) and refuses a bare run, on every machine. That is a
  person's decision; the guard refuses it from an agent even so, which is the fault it exists for.
  A task whose own job ends with the verification (`vp run setup`, `npx remy packages upgrade`,
  `vp run upgrade`) says it is asking, so those run as written.
- **These pages never give a command the tooling refuses.** A heavy command is written with
  `REMY_FLOW=hand` in front or named without `vp run`; `tests/unit/dev-flow.unit.spec.ts` reads
  every English page and every task for one run bare, on every check (2026-10-10: eight lines on six
  pages did, and `vp run setup` ended in the refusal).
- A rule that can be a function belongs in `tests/**/*.unit.spec.ts` (no build, no Worker, no
  browser), so it runs on every check for free. The browser is for what only a browser shows.
- **An agent never waits on a long-running step.** `vp run land`, `vp run promote`, `vp run release`, a
  translation, a remote suite: start it in the background, keep working or answer the owner, and act
  when the harness says it finished. Starting it in the background and then polling it in the
  foreground is the same fault (owner, 2026-10-09: "You just did it again for 2 long running
  things"). Only `vp run check` (seconds) is run and waited for.
- **What runs again is Vite Plus's decision, never ours.** A task whose inputs did not change is replayed from
  Vite Plus's cache, so `vp run check` and `vp run ci` skip what nothing touched, here and (with the cache kept
  between runs) on GitHub. No code of ours decides that something can be skipped (owner, 2026-10-17: "make sure we
  don't have bits of code scattered all over the place"); a task that reruns when it should not has an input to
  declare in its `cache` settings, which `vp run --last-details` names.
- **Anything longer than a few seconds runs in the background, always.** `vp run ci` or any part of it,
  a build, a browser run, an install. A command running in the foreground is cancelled when the owner
  sends a message (the Claude app stops it), so the work silently never happens and the owner is blamed
  for talking. Started in the background, with its output in a file the agent watches, it survives
  every message: the owner can talk to the agent at any time without breaking anything (owner,
  2026-10-17: "this bullshit between foreground and background kicking me in the ass all the bloody
  time").
- **Every step says how long it took, without timing itself.** The command line times every `remy`
  command (`packages/ui/src/cli/timing.ts`, called from `remy.ts`): its record, when it started, its parts
  and its total, passed or failed, is `node_modules/.cache/remy/<command>-last.txt`, and `npx remy last
  [command]` prints it. A command started inside another (`vp run ci` runs `check types` and `test
  every`, `vp run land` runs `i18n translate`) writes into the outer run's record, indented, so one run
  leaves one record of everything it ran. A command only marks its parts (`lap`) and adds what it measured
  itself (`note`: each translator call, each step of the new-app test); it never writes a record or a
  summary of its own (owner, 2026-10-17: "it should get it automatically because it's part of the CLI"). A slow step is a number in the log, not a feeling (owner,
  2026-10-10, of a landing on staging after 40 seconds whose command ran six minutes: "how can it be
  6 minutes").
- **GitHub's answer comes to you.** A red run comments on the commit (GitHub tells its author), naming
  the run; `vp run check` starts by saying what the last run on main did; `vp run promote` refuses a commit
  whose run is not green or not finished. To reproduce a red job, a person runs
  `vp run ci <part>`, the same command GitHub ran, since the workflow holds no
  logic of its own (`remy verify tooling` checks every script a workflow names exists). An agent reads the
  run's own log (`gh run view <id> --log-failed`) and runs the one area
  (`vp run test:browser --grep <words>`). Report what was tested and what was not; never call
  untested work verified.
- **A landing that fails after the push still finishes what it can, and says where it stopped.**
  The pull request is merged before staging; when staging's deploy or its live smoke fails, `vp run land`
  ends non-zero with the state in one line: merged at which commit, staging deployed or not, which
  smoke failed, translation done or not.
  Nothing half-done is left for the next person to discover (owner, 2026-10-10, after a landing stopped
  at the smoke with the translation silently skipped: "now you and other agents are screwed").
- Never pipe a gating command through `grep` or `tail` in a chain: the pipe hides its exit code.
  This once released a version whose checks had failed, and on 2026-10-10 hid a failed `vp run land`.

## Manual work becomes scripts over real tools

Owner, 2026-09-26: "You need to get to the point that your checking uses mise and the underlying tool!"
and "make sure you have something in docs about using your judgment about things that you do manually
being turned into a mise task that uses a tool ... It's vital because all our repos will be using this."

- Every check runs through a script or a `remy` command that wraps the real tool: the flow's steps and
  the checks (`npx remy test`, Playwright), the live smoke after a deploy, `remy plans check`,
  `remy i18n check`, `npx remy shots` to look. (The owner's words above say mise, which the scripts
  replaced on 2026-10-11; the rule is the same.)
  No `curl` loops, one-off scripts or ad-hoc greps to decide whether something works: they cannot be
  repeated, apps on the package do not get them, and nobody sees them later.
- Use judgement on everything done by hand, not only checks: the second time you type the same commands
  or reach for a throwaway script, it becomes a command of the package (`packages/ui/src/cli`, so every
  app gets it) that calls the tool that does the job: Wrangler, Playwright, gh, npm.
- No tool found? Do not write a script and move on. Add a line to `.plans/now.md` to survey for one
  ([choose tools by survey](#choose-tools-by-survey-not-by-first-find)); if the search or the change is big,
  write a plan in `.plans/` (or `.plans/parked/`) yourself. Agents create these lines and plans as they
  meet such things; the owner does not have to ask.
- Anything more than one line of a tool is TypeScript: a command of `remy` (`packages/ui/src/cli`,
  type-checked on every check) or, for what is one app's own, a `scripts/*.ts` of that app, never
  bash logic or untyped JavaScript: what the compiler cannot see, an agent misses (owner, issue #9).
  A one-line tool is a `package.json` script ([the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/tooling-in-typescript.md)).

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
  `dist/`, and two builds in one checkout delete each other's files. Claude Code makes the worktree.
- Each worktree has its own `PREVIEW_PORT` and `DOCS_PREVIEW_PORT`, computed from its name (never
  4190, which browsers block); `PREVIEW_PORT=4232 vp run …` overrides them.
- At most three agents run tests at the same time; research, writing and scratch spikes do not
  count. When more are needed, set `PLAYWRIGHT_WORKERS=2` for each.
- Google's audits (`vp run test:audits`) and Core Web Vitals (`npx remy test cwv`) take a machine-wide lock, so a second
  run waits rather than skewing the first.
- Never chain a deploy after a check with `;`: the flow's steps run each in turn and stop at the first failure.

## Reporting to the owner

- **After every deploy, the report starts with the live URLs of what was deployed**, whatever else it says
  (owner, 2026-09-26: "I keep telling you ... give me the url when you deploy"): the app
  <https://remy-auth.gedw99.workers.dev>, its staging <https://remy-auth-staging.gedw99.workers.dev>, and for the docs Worker its guide
  <https://remy-auth-docs.gedw99.workers.dev/docs>, developer docs
  <https://remy-auth-docs.gedw99.workers.dev/dev> and API reference
  <https://remy-auth-docs.gedw99.workers.dev/reference>. `remy cloudflare deploy` and `remy cloudflare docs-deploy` print them last.
- Every report about something the owner can look at gives its URLs: the live sites, the preview
  (`npx remy cloudflare preview` prints it) and a direct link to each page or feature discussed.
- Say what was checked and what was not.
- What is live is asked, not remembered: `vp run status` prints what each deployment is running
  and how far that is from your checkout. Say it from there, not from what you last deployed.

## Many agents, one flow

Owner, 2026-10-09: "formalise the way we workflow the dev work in many agents to use the new dev
flow". Each piece of work, whoever does it, is one worktree through the same commands; main is
the only integrator, and GitHub checks every landing. Nothing here is done by hand.

The steps, what each runs and who runs it: [the flow's table](#the-flow-four-steps-and-a-guard-that-refuses-the-rest).

- **Split by independence.** An orchestrator splits work into parts that touch different files, and
  starts one agent per part, each in a worktree of its own. A part that needs another's result waits for that
  landing; it does not share a worktree.
- **Spike first when the risk is unknown**: one agent proves the risky point and lands or stops.
- **Every part proves itself**: it lands with its own check in `tests/`, a plain function
  (`tests/**/*.unit.spec.ts`) when it can be one, in the browser when only a browser shows it.
- **Landings serialise themselves.** Two agents landing at once: each has its own pull request; GitHub
  refuses the second merge only when the two conflict, and then the second `vp run land` brings main in,
  translates what the merge left stale, checks again and lands.
- **Hands-on pass before production.** Passing checks is not the end: use the piece on staging in a
  real browser, on a phone's width, and fix what feels bad. Then `vp run promote`.
- **An agent never waits in the foreground** on `vp run land`, `vp run promote` or a GitHub run; it starts
  them in the background and acts on the result. Only `vp run check` is waited for.
- **Everything asynchronous comes back to everyone** ([the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/dev-feedback.md)):
  a red GitHub job writes on the commit, naming itself; `vp run land` says when main is red; `vp run promote`
  writes on the commit what went live; `vp run status` shows all of it to whoever asks, and every agent
  session asks first.
