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
