// The two commands the old Claude hooks call, kept as harmless leaves for one release so a machine that still has
// those hooks registered keeps working until `npx remy hooks` replaces them: `remy guard-hook` (the old PreToolUse
// guard, whose refusal, exit 2, would now block every shell command an agent runs) allows the command and says what to
// run; `remy flow status` (the old SessionStart hook) is `remy status`. An app upgraded from 0.15 registers these
// with 0.15's code on its first `remy upgrade`. Remove both in the release after this one.
export const what =
  "the old Claude hooks' commands, harmless until npx remy hooks replaces them (removed next release)";

export async function guardHook(): Promise<void> {
  console.error('remy: the flow guard is gone; npx remy hooks replaces this hook with the status hook.');
}

export async function flow(args: string[]): Promise<void> {
  if (args[0] !== 'status') {
    console.error('remy flow is gone: the steps are vp run land, promote, release and status (COMMANDS.md).');
    process.exit(2);
  }
  await (await import('./status.ts')).main();
}
