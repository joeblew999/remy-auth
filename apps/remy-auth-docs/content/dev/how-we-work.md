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

## See something: fix it, or write it down, in the same change

Owner, 2026-10-09, after finding a gap each time he asked: "It's rather clear that the agent docs are
wrong if you're seeing issues and not acting on them and informing yourself and devs." So the rule
is general, not only for missing tools:

- An agent or developer who notices anything wrong, slow, missing or left over (a step that waits
  for nothing, a check nobody runs, a branch nobody owns, a doc that says what is no longer true) has
  two choices, both inside the change they are on: **fix it** when it is small, or **write it into
  `.plans/now.md`** ("What is left, in order": what was seen, where, and what would fix it), a plan
  file when it is big. Mentioning it in a chat or a report alone is neither.
- **Everyone hears it through the repo**: `.plans/now.md` is committed, so what one person saw reaches
  everyone who pulls main (`pnpm remy plans status` prints its open items), and the next change takes the top of it.
- **"Done" is the end of a sweep, not of a list.** Before saying it: branches and worktrees (`git branch`,
  `git worktree list`), `pnpm remy cloudflare versions`, `pnpm remy plans check`, a
  search for the words the change retired, the docs the change touched. Show the sweep.

## Use the project's own tools first

- Start with `vp run setup`; [developer tooling](./tooling.md) says what it installs.
- Before doing any step by hand (installing, upgrading, releasing, translating), find its script
  (deploying is Cloudflare's own builds, never a command of ours): `vp run` lists them, in whichever repository you are in; an app has the same ones. Owner,
  2026-09-26, after an app was upgraded by hand past `vp run upgrade`: "you know we do not reinvent wheels".
- Run commands through Vite Plus (`vp run <name>`: a task or a script), check the real page with the Chrome
  DevTools tools ([browser tooling](./tooling.md#browser-tooling)), and use the installed skills before reading upstream sources, searching
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
  [paths.js](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/src/paths.js) defines both.
- **Adopt the TanStack library instead of our own code** (Form, Router's Zod adapter, Table, Devtools
  and so on), install its agent skills, then delete the code it replaces.
- Before writing any UI code, ask: does shadcn, TanStack or Paraglide already do this? If yes, use it.

- Look at it: before calling UI work done, screenshot the pages you changed with `pnpm remy shots` (desktop and
  phone, light and dark, English and Arabic) and look at the screenshots. Checks prove behaviour; only
  the screenshots show layout, spacing, overflow and mixed-direction text; name the pages you changed
  (`pnpm remy shots /formats --phone`), `--all` only for a sweep (owner, 2026-09-26: "It's
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
[paraglide.mjs](https://github.com/joeblew999/remy-auth/blob/main/packages/remy-ui/paraglide.mjs)), and the localized links, with TanStack Router
carrying them. We do not write framework-neutral layers or our own language code; when Paraglide
lacks something, use its options first and record the gap in the owning plan.

## Translations: in the change

English is the source; translations follow it, in the same change. A commit holds its English and
its translations together: one commit, one push, one run of the checks.

- A feature agent writes English only: the English docs and the base catalog (`messages/en.json`).
  It never edits a translation (`<page>.<lang>.md` beside its page) or another locale's catalog by hand.
- `vp run translate` (`remy i18n translate`) translates what the change made stale or missing, on the
  branch, before the commit, so the translations go into the same commit as their English. The Claude agent
  translates exactly what `remy i18n check` lists: for a stale page, only the sections whose English changed; for a
  catalog, only the changed keys.
- **Each translation records what it was made from**: a translated page a fingerprint of each English
  section (`translatedFrom` in its frontmatter), a catalog a fingerprint of each English message
  (`translated-from/<lang>.json` beside it). Stale is where the record and the English differ. No git
  history is read, so the answer is the same on a Mac, in a cloud agent's container and in GitHub's
  shallow checkout, where `vp run ci` checks it too.
- Agents working at once need no lock and no one writer: each worktree translates its own change, and two
  branches that change the same English section already meet at that English; after merging main,
  `vp run translate` again translates whatever the merge left stale. (Until 2026-10-17 translation ran on `main`
  after the push, under a lock, judged by git history: every change that touched docs pushed main twice,
  ran GitHub's checks twice, and a page was rewritten whole for a one-line change.)
- The agent gets no tools: it is handed the English (and, for a stale page, the changed sections and
  their current translation) and returns text; the task writes the files it asked for, with their
  records, and nothing else.
- What the agent returns is written only when it is the page: every frontmatter field its English
  has, and text after it (`packages/remy-cli/src/page.ts`). A failed agent leaves the page as it was, says
  why and fails the translation (exit non-zero); the English can still be committed, the translation is then
  owed, and the next `vp run translate` tries again. `tests/unit/i18n-docs.unit.spec.ts` holds every translated
  page in the repository to the same rule. On 2026-10-09 a failed agent's `null` was committed as a
  page and stopped the docs building on main.
- A translation that is not a page is deleted, never restored by hand: a missing page is translated
  from the English by the next `vp run translate`.
- `remy i18n check` only reads, offline, so it is safe anywhere and in any number of worktrees.
  `remy i18n translate` is never a `depends`.
- Stale or missing is a warning while coding and in `vp run ci` (its `ready` part), and an error at
  release (`remy release check`, the release's first step).
- A structural change (a rename, a sweep) that touches docs translations is followed by
  `pnpm remy i18n translate docs <file>…`, which brings those files fully in line with the
  English. Change a catalog's structure (every locale's file) in the same commit as `en.json`.

The layout and the commands are in [projects](./projects.md#translations).

## Plans: few, short, closed

Owner, 2026-09-26: "how overwhelming and frustrating it is to have so much garbage plans". New work is
one line in `.plans/now.md`, in the order it closes. A plan file is written only for work that is big
enough to be parked or to run over weeks; research, analyses and reviews go into the plan they serve,
not a file of their own. A plan closes the day its work ships: a closing line, then `.plans/done/`. Big
features wait in `.plans/parked/`. Closing a plan needs no extra commit or test run of its own: batch the
code into one commit and one full run at the end.
The `remy plans` commands ([Commands](./commands.mdx)) do the moves and keep `.plans/` tidy; `vp run ready` runs
`remy plans check` (its `check:plans`) on every change ([projects](./projects.md#plans)).

## When the owner delegates decisions

When the owner hands over decisions, for example to finish work unattended:

- Decide, and record each decision with its reasons in the plan that owns it.
- Keep every gate green; delegation never loosens a check.
- Leave a full report: what was decided, what was done, what was checked and what was not.

## The flow: the standard way, in plain sight

Owner, 2026-10-09: "95% of time has been checking and 5% coding. It can't go on", "It's a question of
what you run locally and what you run in GitHub asynchronously", and "make sure the developer flow is also
formalised so that this stupid fuckups can't happen". And 2026-10-17: "in that configuration file of VP, you see
everything. Everything else underneath it should be pretty dumb"; 2026-10-18: "No more crazy magic stuff" and
"Standard way." So the flow is Vite Plus's tasks and scripts, as `vp create vite:monorepo` lays a repository out,
then git, GitHub and Cloudflare's own tools, with nothing of ours wrapping them. Each package's tasks are written out
in its own `vite.config.ts` (no code makes them), the root `vite.config.ts` holds the shared style and the repository's
checks (`ready`), and the root `package.json`'s scripts compose them (`ci`, `translate`, `release`, `setup`); `vp run`
lists every one, and [Commands](./commands.mdx) prints each script's steps. Every `remy` command is a leaf: it does
the one job it names (a check, the translator, a browser run, a Cloudflare question), reads only its arguments and the files that hold
what it needs, and decides nothing else. Work is committed and pushed straight to `main`; when several agents work at once, each takes a worktree
(Claude Code's `.claude/worktrees/<name>`, or `git worktree add`) and pulls before it pushes; two checkouts checking at once give one of them
its own ports (`PREVIEW_PORT`, `DOCS_PREVIEW_PORT`).

| Step | Command | Who runs it, and when | What runs | Time |
| --- | --- | --- | --- | --- |
| Look | `git status`, `git log`, `gh run list`, `pnpm wrangler deployments list`, `pnpm remy cloudflare versions` | everyone, first, and whenever they need to know | git and GitHub's own answers; what each deployment runs, read from its `/healthz`, placed against this checkout | seconds |
| After every change | `vp run ready` | whoever is coding; the only step waited for | Vite Plus's tasks: everything generated, the app and the docs built, Wrangler's deployment dry run, the project's own checks, the unit checks, then `vp check` (format, lint, types); what has not changed comes from Vite Plus's cache | ~8 s unchanged, ~50 s from nothing |
| The change leaves the machine | `vp run translate` (when text changed), `git commit`, `git push` | whoever did the work, on their own, as soon as it is finished | the translations the change made stale, in the same commit; the commit (its hook: `vp staged`); the push to `main` (its hook: `vp run ci`, from the cache where nothing changed; `VP_GIT_HOOKS=0` skips it) | a few minutes: what changed here, in the push's hook |
| Production | a push to `main`: Cloudflare deploys it | nobody; every push to `main` goes live | Cloudflare's Git builds (Workers Builds) build and deploy the app and the docs from each push to `main`, and every other branch's Preview from its own push ([on Cloudflare](./run-and-test.md#on-cloudflare)); after a docs change, `pnpm remy docs publish` (a machine signed in to Cloudflare) gives Ask AI's index the new pages | a few minutes after the push |
| A release | `vp run release` | the owner, or an agent the owner asked in that session | `remy release check` (a clean main, translations complete, versions bumped) → `CHECK_LOCALES=all vp run ci` (every language) → `vp run template:check` → `vp run ui:verify` → `vp run publish:rehearse` → `remy test cwv` → `remy packages tag`; GitHub's release job publishes from the tag | ~5 min |

GitHub's CI workflow is off, by the owner's choice: `vp run ci` runs the same here, and the push's hook runs it before
anything leaves the machine. No pull requests, auto-merge or branch rules: `main` takes the push.

- **Who runs a step is in the table, and it is never a question.** An agent pushes its own
  finished work to `main` without asking: its push ran `vp run ci` first, and nothing red is pushed. The owner's word is for a release, the one step whose column says so, and for provisioning
  ([development principles](./principles.md#development-principles)). An agent that reads the table and still asks
  whether to push has stopped using the flow (owner, 2026-10-10, after one did: "Is it absolutely clear when each
  should be run by you?").
- **Nothing of ours wraps git, GitHub or Cloudflare.** The landing and promotion automation (`vp run land`,
  `vp run promote`, `remy land`, `remy promote`, `remy status`, the Claude status hook, our own Cloudflare deploys)
  is gone, as is the old guard that refused commands outside the flow (owner, 2026-10-18). What still costs
  something (the translator spends Claude's tokens) runs by name from a
  script, where anyone can see it.
- **Nothing is handed on through the environment.** A `remy` command reads the value it needs from the file that
  holds it (the app's `.env`, its `wrangler.jsonc`, `remy.config.ts`) and passes a child only what that child needs; no command sets variables for others to find, and no hidden
  switch changes what a command does (`tests/unit/dev-flow.unit.spec.ts` refuses both). The one setting a person
  gives is `CHECK_LOCALES` (`all`, `quick` or a list).
- One area that looks wrong: `vp run test:browser --grep <words>` (the browser checks whose title
  matches). It is the only browser run a step does not own.
- A rule that can be a function belongs in `tests/**/*.unit.spec.ts` (no build, no Worker, no
  browser), so it runs on every check for free. The browser is for what only a browser shows.
- **An agent never waits on a long-running step.** `git push` (its hook runs `vp run ci`), `vp run release`, a
  translation, a remote suite, GitHub's checks: start it in the background, keep working or answer the owner, and act
  when the harness says it finished. Starting it in the background and then polling it in the
  foreground is the same fault (owner, 2026-10-09: "You just did it again for 2 long running
  things"). Only `vp run ready` (seconds) is run and waited for.
- **What runs again is Vite Plus's decision, never ours.** A task whose inputs did not change is replayed from
  Vite Plus's cache, so `vp run ready` and `vp run ci` skip what nothing touched, here and (with the cache kept
  between runs) on GitHub. No code of ours decides that something can be skipped; a task that reruns when it should
  not has an input to declare in its `cache` settings, which `vp run --last-details` names. What a task's command
  starts counts too: a build that ran git read every changed file in the repository, so every change rebuilt it
  (2026-10-17, traced); nothing of ours runs git inside a task now. The cache is per task, never `run.cache: true`,
  which would cache every script too.
- **Anything longer than a few seconds runs in the background, always.** `vp run ci` or any part of it,
  a push, a build, a browser run, an install. A command running in the foreground is cancelled when the owner
  sends a message (the Claude app stops it), so the work silently never happens and the owner is blamed
  for talking. Started in the background, with its output in a file the agent watches, it survives
  every message: the owner can talk to the agent at any time without breaking anything (owner,
  2026-10-17: "this bullshit between foreground and background kicking me in the ass all the bloody
  time").
- **Where the time goes is Vite Plus's to say.** `vp run --last-details` names each task, whether it came from the
  cache and why it ran; a slow step is a number in that, not a feeling (owner, 2026-10-10: "how can it be
  6 minutes").
- **GitHub's answer comes to you**, while its CI workflow is on. A red run comments on the commit (GitHub tells its
  author), naming the run; `gh run list` and `gh run view <id>` show the rest. To reproduce a red
  job, a person runs `vp run <task>` (the job's name), the same command GitHub ran, since the workflow holds no
  logic of its own (`remy verify tooling` checks every task a workflow names exists). An agent reads the
  run's own log (`gh run view <id> --log-failed`) and runs the one area
  (`vp run test:browser --grep <words>`). Report what was tested and what was not; never call
  untested work verified.
- **A deploy that fails is Cloudflare's build, and says so there.** The merge has happened; the build's log (the
  Cloudflare connector's builds tools, or the dashboard) names what failed, and `pnpm remy test live <origin>` runs the
  smoke against a deployment by hand. A failed translation exits non-zero before anything is committed: nothing
  half-translated reaches main.
- Never pipe a gating command through `grep` or `tail` in a chain: the pipe hides its exit code.
  This once released a version whose checks had failed, and on 2026-10-10 hid a failed check.

## Manual work becomes scripts over real tools

Owner, 2026-09-26: "You need to get to the point that your checking uses mise and the underlying tool!"
and "make sure you have something in docs about using your judgment about things that you do manually
being turned into a mise task that uses a tool ... It's vital because all our repos will be using this."

- Every check runs through a script or a `remy` command that wraps the real tool: the checks
  (`pnpm remy test`, Playwright), the live smoke against a deployment (`pnpm remy test live`), `remy plans check`,
  `remy i18n check`, `pnpm remy shots` to look. (The owner's words above say mise, which the scripts
  replaced on 2026-10-11; the rule is the same.)
  No `curl` loops, one-off scripts or ad-hoc greps to decide whether something works: they cannot be
  repeated, apps on the package do not get them, and nobody sees them later.
- Use judgement on everything done by hand, not only checks: the second time you type the same commands
  or reach for a throwaway script, it becomes a command of the package (`packages/remy-cli/src`, so every
  app gets it) that calls the tool that does the job: Wrangler, Playwright, gh, pnpm.
- No tool found? Do not write a script and move on. Add a line to `.plans/now.md` to survey for one
  ([choose tools by survey](#choose-tools-by-survey-not-by-first-find)); if the search or the change is big,
  write a plan in `.plans/` (or `.plans/parked/`) yourself. Agents create these lines and plans as they
  meet such things; the owner does not have to ask.
- Anything more than one line of a tool is TypeScript: a command of `remy` (`packages/remy-cli/src`,
  type-checked on every check) or, for what is one app's own, a `scripts/*.ts` of that app, never
  bash logic or untyped JavaScript: what the compiler cannot see, an agent misses (owner, issue #9).
  A one-line tool is a `package.json` script ([the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/done/tooling-in-typescript.md)).

## Branches: only for a Preview, deleted after

- Work is pushed straight to `main`. A branch is for trying something on its Cloudflare Preview before it goes live
  (`git switch -c <name>`, `git push -u origin <name>`); once it is good it goes into `main` (`git switch main`,
  `git merge --ff-only <name>` or `git merge <name>`, `git push`) and the branch is deleted, here and on GitHub
  (`git push origin --delete <name>`).
- A leftover merged branch (local or on GitHub) is noise, not history: `main` and the tags hold it.

## Sharing one machine between agents

The machine crashed on 2026-09-25 with about ten agents building and testing at once (load 188),
and timing-sensitive checks failed well before that. So:

- An agent builds and tests only in its own git worktree, never in the main checkout: builds write
  `dist/`, and two builds in one checkout delete each other's files. Claude Code makes the worktree.
- Two checkouts checking at once give one of them its own `PREVIEW_PORT` and `DOCS_PREVIEW_PORT` (defaults 4173
  and 4174; never 4190, which browsers block): `PREVIEW_PORT=4232 DOCS_PREVIEW_PORT=4233 vp run …`.
- At most three agents run tests at the same time; research, writing and scratch spikes do not
  count. When more are needed, set `PLAYWRIGHT_WORKERS=2` for each.
- Google's audits (`vp run test:audits`) and Core Web Vitals (`pnpm remy test cwv`) take a machine-wide lock, so a second
  run waits rather than skewing the first.
- Never chain one step after a check with `;`: the scripts chain with `&&`, so they stop at the first failure.

## Reporting to the owner

- **After every merge that deploys, the report starts with the live URLs of what goes live**, whatever else it says
  (owner, 2026-09-26: "I keep telling you ... give me the url when you deploy"): the app
  <https://remy-auth.gedw99.workers.dev>, and for the docs Worker its guide
  <https://remy-auth-docs.gedw99.workers.dev/docs>, developer docs
  <https://remy-auth-docs.gedw99.workers.dev/dev> and API reference
  <https://remy-auth-docs.gedw99.workers.dev/reference>. `pnpm remy cloudflare urls` prints a deployment's.
- Every report about something the owner can look at gives its URLs: the live sites, the preview
  (a pushed branch's Cloudflare Preview, `https://<branch>-remy-auth.gedw99.workers.dev`) and a direct link to each page or
  feature discussed.
- Say what was checked and what was not.
- What is live is asked, not remembered: `pnpm remy cloudflare versions` prints what each deployment is running
  and how far that is from your checkout (`wrangler deployments list` gives Cloudflare's own list). Say it from
  there, not from what you last merged.

## Many agents, one flow

Owner, 2026-10-09: "formalise the way we workflow the dev work in many agents to use the new dev
flow". Each piece of work, whoever does it, is one branch through the same commands; main is
the only integrator, and every push runs `vp run ci` first. Nothing here is done by hand.

The steps, what each runs and who runs it: [the flow's table](#the-flow-the-standard-way-in-plain-sight).

- **Split by independence.** An orchestrator splits work into parts that touch different files, and
  starts one agent per part, each in a worktree of its own. A part that needs another's result waits for that
  push; it does not share a worktree.
- **Spike first when the risk is unknown**: one agent proves the risky point and pushes or stops.
- **Every part proves itself**: it goes in with its own check in `tests/`, a plain function
  (`tests/**/*.unit.spec.ts`) when it can be one, in the browser when only a browser shows it.
- **Pushes serialise themselves.** Two agents at once: GitHub refuses the second push to `main`, and the second agent
  pulls (`git pull --rebase origin main`), runs `vp run translate` for what that left stale and `vp run ready`, and
  pushes again.
- **Hands-on pass before it goes live.** Every push to `main` goes live, so for anything a person sees, passing checks
  is not the end: use it on a branch's Cloudflare Preview in a real browser, on a phone's width, and fix what feels bad.
  Then push it to `main`.
- **An agent never waits in the foreground** on `git push` (its hook runs `vp run ci`), a GitHub run or a Cloudflare
  build; it starts them in the background and acts on the result. Only `vp run ready` is waited for.
- **Everything asynchronous comes back to everyone** ([the plan](https://github.com/joeblew999/remy-auth/blob/main/.plans/dev-feedback.md)):
  a red GitHub job writes on the commit, naming itself; `gh run list` and `pnpm remy cloudflare versions`
  show the rest to whoever asks.
