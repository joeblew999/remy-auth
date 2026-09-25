# How we work

[Back to the agent index](../AGENTS.md) · [Development principles](development.md) · [Developer tooling](tooling.md)

This document owns how people and agents work: the habits the owner has asked for, for developers
and AI agents alike. What the code must be lives in [development principles](development.md).

## Where rules live

- Write down how we work here, in the repository, not in an agent's private memory. Anyone
  opening the repository, person or agent, should find the same rules. Agent memory is only for
  things that concern one agent, never for how the project works.
- Each fact has one home, as [development principles](development.md#development-principles)
  require; that applies to these rules too.

## Use the project's own tools first

- Start with `mise run project:setup`; [developer tooling](tooling.md) says what it installs.
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
  [paths.js](../packages/ui/src/paths.js) defines both.
- **Adopt the TanStack library instead of our own code** (Form, Router's Zod adapter, Table, Devtools
  and so on), install its agent skills, then delete the code it replaces.
- Before writing any UI code, ask: does shadcn, TanStack or Paraglide already do this? If yes, use it.

## Language: Paraglide owns it

Paraglide owns all language behaviour: which language a request gets, through its strategies
`url`, `cookie`, `preferredLanguage` and `baseLocale` (set in
[paraglide.mjs](../packages/ui/paraglide.mjs)), and the localized links, with TanStack Router
carrying them. We do not write framework-neutral layers or our own language code; when Paraglide
lacks something, use its options first and record the gap in the owning plan.

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
- Development deploys (`mise run cf:deploy`) run no tests. Judge each one: a change to app or
  shared-package code that visitors run gets the quick gate first (`GATE=1 mise run cf:deploy`,
  one language per writing system); docs text, plans, tasks and config that do not change what
  visitors get deploy straight away. Say which you chose when reporting.
- Never pipe a gating command through `grep` or `tail` in a chain: the pipe hides its exit code.
  This once released a version whose checks had failed.
- Report what was tested and what was not; never call untested work verified.

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
- `GATE=1 mise run cf:deploy` runs the quick gate itself; never chain a deploy after a gate with `;`.

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
