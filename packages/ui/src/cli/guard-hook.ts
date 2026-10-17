// The flow's guard: a Claude Code PreToolUse hook on Bash (registered by `remy guard` in the repo's
// .claude/settings.local.json). It reads the command an agent is about to run; one that names a heavy
// check outside the flow is refused, with the step to use instead. A developer at a terminal is not
// an agent: a heavy task by hand stays a decision. Exit 2 is how a hook refuses; its stderr is
// what the agent reads.
import { heavyIn } from './flow.ts';

export const what =
  'the Claude PreToolUse hook the guard registers: refuses a heavy check outside the flow, naming the step';
export async function main(): Promise<void> {
  const input = JSON.parse(
    await new Promise<string>((resolve) => {
      let text = '';
      process.stdin.setEncoding('utf8');
      process.stdin.on('data', (chunk) => {
        text += chunk;
      });
      process.stdin.on('end', () => resolve(text || '{}'));
    }),
  );
  const command: string = input?.tool_input?.command ?? '';
  // The flow's own steps run heavy tasks on purpose (dev:land, dev:promote, dev:release): they are not refused.
  const aStep = /\b(npm\s+run\s+dev:|remy\s+)(change|land|promote|release)\b/.test(command);
  const found = command && !aStep ? heavyIn(command) : undefined;
  if (found) {
    // What to run instead is COMMANDS.md, generated from the command line; never a list written here (it drifted).
    console.error(
      `The flow refuses \`${found.task}\` here: ${found.why}.\nWhat to run instead: COMMANDS.md ("What you run" first), generated from the command line.`,
    );
    process.exit(2);
  }
}
