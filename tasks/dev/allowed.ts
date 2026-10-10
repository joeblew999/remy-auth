// The flow's gate, in the tooling itself: every heavy task runs this first, and it passes only when
// the flow is what called it (REMY_FLOW, which dev:land, dev:promote and dev:release set for what
// they run), on GitHub (where the workflow runs them after a push), or by a hand that said so
// (REMY_FLOW=hand, a visible decision at a terminal). A task whose own job ends with the verification
// (project:setup, packages:upgrade, project:upgrade-ui) says it is asking the same way; called bare,
// each ended in this refusal (2026-10-10; tests/unit/dev-flow.unit.spec.ts now reads every task for
// it). Anything else, an agent or a habit, is
// refused with the step to use instead. It holds for every agent and every machine, because it is
// the task that refuses, not a setting on the machine; the Claude hook (guard-hook.ts) only answers
// a step earlier, before the command runs.
import { heavy } from './flow.ts';

const task = process.argv[2] ?? '';
const by = process.env.REMY_FLOW;
const onGitHub = process.env.GITHUB_ACTIONS === 'true';
if (by || onGitHub) process.exit(0);
const why = heavy[task] ?? 'a heavy check';
console.error(`${task}: not in the flow (${why}).\nThe steps: mise run dev:change (after every change, seconds) · mise run dev:land -- "<message>" (commit, main, push, staging; GitHub runs the heavy checks) · mise run dev:promote (production) · mise run dev:release (a release). One area: mise run project:test:only -- <words>.\nBy hand, on purpose: REMY_FLOW=hand mise run ${task}`);
process.exit(1);
