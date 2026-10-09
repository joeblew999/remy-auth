# Feedback from everything asynchronous, to every developer and agent, through the tooling

Owner, 2026-10-09: "make a plan so that all async stuff gives all devs feedback to all devs and hence
you via our tooling, make it integrated into what we have now." Status: built and on main the same day (`dev:status`, the SessionStart hook, the red-main line in
`dev:land`, the promotion comment, the red job naming itself). One thing found while using it: a
landing waited minutes for translation before staging; `dev:land` now deploys staging first and
translates last ([now.md](now.md), item 1). Closes when that is on main.

## What is asynchronous now, and who hears about it

| What runs on its own | Who is told today | Who is not |
| --- | --- | --- |
| GitHub's three jobs after every push (every language, Google, consumers) | the committer, by a comment on a red commit (email); whoever asks `gh run list`; the next `dev:change` on any machine says what the last run on main did | another agent landing on top of a red main; anyone who does not run `dev:change` |
| Staging, deployed by every `dev:land` | the one who landed, in their terminal | everyone else; the Worker knows (`/healthz`) but nobody asks |
| Production and the docs Worker, by `dev:promote` | the one who promoted; `cf:versions` when asked | everyone else, and the commit itself says nothing |
| Translation, by `dev:land` on main | the one who landed, in their terminal; a commit on main | everyone whose branch is now behind by that commit |
| A landing by another agent (main moved) | nobody, until the next `dev:land` merges main in | every other agent |

The gap is the same in every row: the fact exists somewhere true (GitHub, the Worker, git) and
reaches one person, or nobody, by terminal output. The owner's rule for deployments already says
what to do: **asked, never remembered** (`cf:versions`). The fix is one place that asks everything
and puts the answer where people and agents already are.

## Design: one answer, asked by the tooling

1. **`mise run dev:status`**, one screen, two seconds, from the facts' owners and nothing stored:
   main's head and GitHub's verdict on the last five commits of main (result, link, who landed it);
   what each deployment runs (`cf:versions`); every worktree and branch, ahead and behind main (who
   is working on what, and who is behind a red commit); translations complete or not (`i18n:check`);
   open pull requests. TypeScript, `tasks/dev/status.ts`, in the shared tasks, so every app has it.
2. **Every agent session starts with it.** `dev:guard` also registers a Claude Code `SessionStart`
   hook that runs `dev:status`, so an agent's context opens with the state of the repo; Codex and a
   developer get the same from the rules block (`agents:rules`) and the `remy` skill: first command.
   `dev:change` keeps its one line (the last run on main).
3. **A landing on a red main says so.** `dev:land` prints GitHub's verdict on main's head before
   landing and names the commit and the run when it is red; it does not refuse, because the fix is
   itself a landing, but nobody lands on red without being told.
4. **A promotion writes itself on the commit.** `dev:promote` comments on the promoted commit with the
   production origin, the Worker version and the docs origin, so the commit page and GitHub's
   notifications carry what went live; `cf:versions` stays the truth of what is live now.
5. **The red-run comment names the job.** The workflow's `report` job says which of the three jobs
   failed (from the matrix results), not only that one did.

What stays as it is: a green run tells nobody (noise); staging is every landing, and the Worker
says what it runs. What is not built: a chat or mail channel of our own (GitHub's notifications are
the channel every developer already has), and a record of deployments (the Workers answer).

## Checks

`tests/unit/dev-status.unit.spec.ts`: the status composes from given facts (no network) and names a
red commit and a branch behind it; `project:verify-tooling` already checks the workflow names only
tasks that exist. The hook registration is checked by `dev:guard -- --check` in `project:verify`.
