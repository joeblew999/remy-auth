// The flow's guard: a Claude Code PreToolUse hook on Bash (registered by `remy guard` in the repo's
// .claude/settings.json). It reads the command an agent is about to run; one that names a heavy
// check outside the flow is refused, with the step to use instead. A developer at a terminal is not
// an agent: a heavy task by hand stays a decision. Exit 2 is how a hook refuses; its stderr is
// what the agent reads.
import { heavyIn } from './flow.ts';

export async function main(): Promise<void> {
  const input = JSON.parse(await new Promise<string>(resolve => {
    let text = '';
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', chunk => { text += chunk; });
    process.stdin.on('end', () => resolve(text || '{}'));
  }));
  const command: string = input?.tool_input?.command ?? '';
  // The flow's own steps run heavy tasks on purpose (dev:land, dev:promote, dev:release): they are not refused.
  const aStep = /\b(mise\s+run\s+dev:|npm\s+run\s+dev:|remy\s+)(change|land|promote|release)\b/.test(command);
  const found = command && !aStep ? heavyIn(command) : undefined;
  if (found) {
    console.error(`The flow refuses \`${found.task}\` here: ${found.why}.\nThe steps: npm run dev:change (after every change, seconds) · npm run dev:land -- "<message>" (commit, main, push, staging; GitHub runs the heavy checks) · npm run dev:promote (production) · npm run dev:release (a release). One area: mise run project:test:only -- <words>.`);
    process.exit(2);
  }
}
