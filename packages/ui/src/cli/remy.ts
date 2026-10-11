#!/usr/bin/env node
// remy: the platform's command line, a Remy app's whole tooling in TypeScript that Node runs as it is
// (no build), type-checked by the app's tsc. package.json's scripts are the entry, as in every
// TypeScript project ("dev:land": "remy land"); owner, 2026-10-11: "strip away mise so that its all
// typescript", "use the package.json as the entry point like all typescript projects do". What a step
// still runs through mise goes through internal.ts, one call per task, until its slice replaces it
// (.plans/tooling-in-typescript.md).
import { configure } from './config.ts';

type Command = { main: (args: string[]) => void | Promise<void> };
const commands: Record<string, () => Promise<Command>> = {
  status: () => import('./status.ts'),
  start: () => import('./start.ts'),
  change: () => import('./change.ts'),
  land: () => import('./land.ts'),
  promote: () => import('./promote.ts'),
  release: () => import('./release.ts'),
  done: () => import('./done.ts'),
  guard: () => import('./register.ts'),
  'guard-hook': () => import('./guard-hook.ts'),
  allowed: () => import('./allowed.ts'),
  // The check's parts by name, and the plans rule: hand tools, and what the mise tasks forward to.
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

const [name = '', ...args] = process.argv.slice(2);
const load = commands[name];
if (!load) {
  console.error(`remy: ${name ? `no command "${name}"` : 'a command is needed'}. The flow, as npm run dev:<step>: status · start <name> · change · land "<what changed>" · promote · release · done.`);
  process.exit(2);
}
await configure();
await (await load()).main(args);
