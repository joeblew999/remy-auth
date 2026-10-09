// The flow's guard: a Claude Code PreToolUse hook on Bash (registered by dev:guard in the repo's
// .claude/settings.json). It reads the command an agent is about to run; one that names a heavy
// check outside the flow is refused, with the step to use instead. A developer at a terminal is not
// an agent: `mise run <task>` by hand stays a decision. Exit 2 is how a hook refuses; its stderr is
// what the agent reads.
import { heavyIn } from './flow.ts';

const input = JSON.parse(await new Promise<string>(resolve => {
  let text = '';
  process.stdin.setEncoding('utf8');
  process.stdin.on('data', chunk => { text += chunk; });
  process.stdin.on('end', () => resolve(text || '{}'));
}));
const command: string = input?.tool_input?.command ?? '';
// The flow's own steps run heavy tasks on purpose (dev:land, dev:promote, dev:release): they are not refused.
const found = command && !/\bmise\s+run\s+dev:(change|land|promote|release)\b/.test(command) ? heavyIn(command) : undefined;
if (found) {
  console.error(`The flow refuses \`${found.task}\` here: ${found.why}.\nThe steps: mise run dev:change (after every change, seconds) · mise run dev:land -- "<message>" (commit, main, push, staging; GitHub runs the heavy checks) · mise run dev:promote (production) · mise run dev:release (a release). One area: mise run project:test:only -- <words>.`);
  process.exit(2);
}
