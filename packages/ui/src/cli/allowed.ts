// The flow's gate, in the tooling itself: every heavy task runs this first, and it passes only when
// the flow is what called it (REMY_FLOW, which vp run land, vp run promote and vp run release set for what
// they run), on GitHub (where the workflow runs them after a push), or by a hand that said so
// (REMY_FLOW=hand, a visible decision at a terminal). An installation (vp run setup, the upgrades)
// ends with npx remy verify setup, which runs nothing heavy, so it never meets this gate.
// Anything else, an agent or a habit, is refused with the step to use instead. It holds for every
// agent and every machine, because it is the task that refuses, not a setting on the machine; the
// Claude hook (guard-hook.ts) only answers a step earlier, before the command runs.
import { heavy } from './flow.ts';

/** Refuses `task` unless a step, GitHub or a hand that said so is running it. */
export function gate(task: string): void {
  const by = process.env.REMY_FLOW;
  const onGitHub = process.env.GITHUB_ACTIONS === 'true';
  if (by || onGitHub) return;
  const why = heavy[task] ?? 'a heavy check';
  console.error(
    `${task}: not in the flow (${why}).\nThe steps, and what each runs: COMMANDS.md (vp run check after every change; vp run land "<what changed>" when the work is finished). One area: npx remy test only <words>.\nBy hand, on purpose, at a terminal: REMY_FLOW=hand in front of the command.`,
  );
  process.exit(1);
}

export const what = '<task>: may this heavy task run now (the gate the flow sets; refused with exit 1 outside it)';
export const main = (args: string[]): void => gate(args[0] ?? '');
