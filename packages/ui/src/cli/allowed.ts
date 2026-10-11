// The flow's gate, in the tooling itself: every heavy task runs this first, and it passes only when
// the flow is what called it (REMY_FLOW, which dev:land, dev:promote and dev:release set for what
// they run), on GitHub (where the workflow runs them after a push), or by a hand that said so
// (REMY_FLOW=hand, a visible decision at a terminal). An installation (project:setup, the upgrades)
// ends with project:verify-setup, which runs nothing heavy, so it never meets this gate.
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
  console.error(`${task}: not in the flow (${why}).\nThe steps: npm run dev:change (after every change, seconds) · npm run dev:land -- "<message>" (commit, main, push, staging; GitHub runs the heavy checks) · npm run dev:promote (production) · npm run dev:release (a release). One area: npm run test -- only <words>.\nBy hand, on purpose, at a terminal: REMY_FLOW=hand in front of the command.`);
  process.exit(1);
}

export const what = '<task>: may this heavy task run now (the gate the flow sets; refused with exit 1 outside it)';
export const main = (args: string[]): void => gate(args[0] ?? '');
