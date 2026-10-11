#!/usr/bin/env node
// remy: the platform's command line, a Remy app's whole tooling, in TypeScript. Every app gets it by
// installing @joeblew999/remy-ui: the package's bin is the JavaScript emitted from this directory
// (packages/ui/cli, by `npm run generate` and prepack), because Node strips types from nothing under
// node_modules; remy-auth alone runs this source as it is. package.json's scripts are the entry in every
// app, as in every TypeScript project ("dev:land": "remy land"), and remy.config.ts holds what is the
// app's own (origins, ports, the release package). Owner, 2026-10-11: "strip away mise so that its all
// typescript", "use the package.json as the entry point like all typescript projects do". The plan that
// did it: .plans/done/tooling-in-typescript.md; remy-auth-app is the first consumer on it.
import { configure } from './config.ts';
import { flowCommands } from './flow.ts';
import type { Tool } from './commands.ts';

// The flow's steps are scripts: importing one runs it, so `remy help` lists them from flow.ts's table.
type Script = { main: (args: string[]) => void | Promise<void> };
const flow: Record<keyof typeof flowCommands, () => Promise<Script>> = {
  status: () => import('./status.ts'),
  start: () => import('./start.ts'),
  change: () => import('./change.ts'),
  land: () => import('./land.ts'),
  promote: () => import('./promote.ts'),
  release: () => import('./release.ts'),
  done: () => import('./done.ts'),
};
// Every other command is a module that exports its one line (`what`), its subcommands as data when it has
// any (`commands`, which its main dispatches on) and `main` (commands.ts): the type here demands them, so
// `remy help` reads the modules and a command cannot exist without its line.
const tools: Record<string, () => Promise<Tool>> = {
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
  app: () => import('./dev.ts'),
  test: () => import('./test.ts'),
  docs: () => import('./docs.ts'),
  observe: () => import('./observe.ts'),
  shots: () => import('./shots.ts'),
  api: () => import('./api.ts'),
  upgrade: () => import('./upgrade.ts'),
};

/**
 * `remy help` (or no command, or an unknown one): every command, one line each, read from the flow's table
 * and from the modules themselves; a command with subcommands names them, and says each one's line when run
 * without one. package.json's scripts are the everyday entry (npm run lists them).
 */
async function help(out: (line: string) => void): Promise<void> {
  const width = Math.max(...[...Object.keys(flowCommands), ...Object.keys(tools)].map(key => key.length));
  out("remy <command> [args]   (npm run lists this app's scripts; a command run without a subcommand says its own)");
  out('The flow, as npm run dev:<step>:');
  for (const [command, { what }] of Object.entries(flowCommands)) out(`  ${command.padEnd(width)}  ${what}`);
  out('The rest, as npx remy <command>:');
  for (const [command, load] of Object.entries(tools)) {
    const tool = await load();
    out(`  ${command.padEnd(width)}  ${tool.what}${tool.commands ? ` — ${Object.keys(tool.commands).join(' · ')}` : ''}`);
  }
}

const [name = '', ...args] = process.argv.slice(2);
if (name === 'help' || name === '--help' || name === '-h') { await help(console.log); process.exit(0); }
const load = flow[name as keyof typeof flow] ?? tools[name];
if (!load) {
  console.error(`remy: ${name ? `no command "${name}".` : 'a command is needed.'}`);
  await help(console.error);
  process.exit(2);
}
await configure();
await (await load()).main(args);
