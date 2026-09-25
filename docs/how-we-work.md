# How we work

[Back to the agent index](../AGENTS.md) · [Development principles](development.md) · [Developer tooling](tooling.md)

These are the working habits the owner has asked for, for developers and AI agents alike.

## Where rules live

- Write down how we work here, in the repository, not in an agent's private memory. Anyone
  opening the repository, person or agent, should find the same rules. Agent memory is only for
  things that concern one agent, never for how the project works.
- Each rule has one home. Link to it instead of repeating it.

## Use the project's own tools first

- Run commands through the mise tasks, check the real page with the Chrome DevTools tools
  (`browser:*` tasks), and use the installed skills before reading upstream sources, searching
  `node_modules` or writing one-off scripts.
- Look at the real page with the browser tools before writing a test for it.
- Once the tools can answer a question, stop researching and use them.
- Say how long a step will take before starting anything slower than a few seconds.

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
- **Two kinds of page** ([paths](../packages/ui/src/paths.js)): site pages are for Google and work
  without JavaScript, so they use only static shadcn parts; app pages live under `/app`, need
  JavaScript and use the sidebar app shell. Checks keep them apart.
- **Adopt the TanStack library instead of our own code** (Form, Router's Zod adapter, Table, Devtools
  and so on), install its agent skills, then delete the code it replaces.
- Before writing any UI code, ask: does shadcn, TanStack or Paraglide already do this? If yes, use it.

## Gates before anything leaves the machine

- Run the local gate (`mise run project:verify`) and see it pass before any push, tag, release
  or deploy. CI is slow; a red CI run costs far more than a local run.
- Never pipe a gating command through `grep` or `tail` in a chain: the pipe hides its exit code.
  This once released a version whose checks had failed.

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
