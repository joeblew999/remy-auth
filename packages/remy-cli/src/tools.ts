// The command line's commands, one module each, in the order `remy help` and the commands page list them. The
// one registry: remy.ts dispatches through it, help.ts describes it (to the terminal and to COMMANDS.md).
import type { Tool } from './commands.ts';

// Every command is a module that exports its one line (`what`), its subcommands as data when it has any
// (`commands`, which its main dispatches on) and `main` (commands.ts): the type here demands them, so
// `remy help` reads the modules and a command cannot exist without its line.
export const tools: Record<string, () => Promise<Tool>> = {
  i18n: () => import('./i18n.ts'),
  cloudflare: () => import('./cloudflare.ts'),
  skills: () => import('./skills.ts'),
  rules: () => import('./rules.ts'),
  test: () => import('./test.ts'),
  docs: () => import('./docs.ts'),
  observe: () => import('./observe.ts'),
  shots: () => import('./shots.ts'),
  upgrade: () => import('./upgrade.ts'),
};

/** The commands help and COMMANDS.md list: every one. */
export const listed = (): string[] => Object.keys(tools);
