// A command's subcommands as data (owner, 2026-10-11: the help should be "less hardcoded because i am sure
// you will forget to keep it update"): one table per module says what each subcommand does and what runs.
// The module's main dispatches on it, its usage prints from it, and `remy help` lists it, so a subcommand
// cannot exist without its line, and a line cannot outlive its subcommand. A module without subcommands
// exports its one line (`what`) and its own main; the type of the registry (remy.ts) demands both.

/** One subcommand: its line (its arguments first, then what it does) and what runs with the rest of the arguments. */
export type Subcommand = { what: string; run: (rest: string[]) => void | Promise<void> };
export type Subcommands = Record<string, Subcommand>;
/** What a command module exports: its one line, its subcommands when it has any, and main. */
export type Tool = { what: string; commands?: Subcommands; main: (args: string[]) => void | Promise<void> };

/** The usage a command prints without a subcommand, from its table. */
export function usage(name: string, commands: Subcommands): string {
  const width = Math.max(...Object.keys(commands).map((key) => key.length));
  return [
    `remy ${name} <subcommand>`,
    ...Object.entries(commands).map(([key, { what }]) => `  ${key.padEnd(width)}  ${what}`),
  ].join('\n');
}

/**
 * A main that dispatches its first argument through the table. No argument runs `fallback` where the
 * command has one (test: every), else prints the usage, as an unknown subcommand does.
 */
export function dispatch(name: string, commands: Subcommands, fallback?: string): (args: string[]) => Promise<void> {
  return async (args) => {
    const [key = fallback, ...rest] = args;
    const command = key === undefined ? undefined : commands[key];
    if (!command) {
      console.error(
        key === undefined || key === fallback
          ? usage(name, commands)
          : `remy ${name}: no subcommand "${key}".\n${usage(name, commands)}`,
      );
      process.exit(2);
    }
    await command.run(rest);
  };
}
