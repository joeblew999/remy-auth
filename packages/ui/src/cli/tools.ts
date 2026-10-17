// The command line's commands, one module each, in the order `remy help` and the commands page list them. The
// one registry: remy.ts dispatches through it, help.ts describes it (to the terminal and to COMMANDS.md).
import type { Tool } from './commands.ts';

// Every command is a module that exports its one line (`what`), its subcommands as data when it has any
// (`commands`, which its main dispatches on) and `main` (commands.ts): the type here demands them, so
// `remy help` reads the modules and a command cannot exist without its line. The flow is the first:
// `remy flow <step>` (flow.ts), each step its own module behind it.
export const tools: Record<string, () => Promise<Tool>> = {
  flow: () => import('./flow.ts'),
  guard: () => import('./register.ts'),
  'guard-hook': () => import('./guard-hook.ts'),
  allowed: () => import('./allowed.ts'),
  check: () => import('./check.ts'),
  plans: () => import('./plans.ts'),
  i18n: () => import('./i18n.ts'),
  cloudflare: () => import('./cloudflare.ts'),
  setup: () => import('./setup.ts'),
  verify: () => import('./verify.ts'),
  skills: () => import('./skills.ts'),
  mcp: () => import('./mcp.ts'),
  rules: () => import('./rules.ts'),
  packages: () => import('./packages.ts'),
  test: () => import('./test.ts'),
  ci: () => import('./ci.ts'),
  docs: () => import('./docs.ts'),
  observe: () => import('./observe.ts'),
  shots: () => import('./shots.ts'),
  api: () => import('./api.ts'),
  last: () => import('./timing.ts'),
  upgrade: () => import('./upgrade.ts'),
};
