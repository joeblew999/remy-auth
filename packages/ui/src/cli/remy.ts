#!/usr/bin/env node
// remy: the platform's command line, a Remy app's whole tooling in TypeScript that Node runs as it is
// (no build), type-checked by the app's tsc. package.json's scripts are the entry, as in every
// TypeScript project ("dev:land": "remy land"); owner, 2026-10-11: "strip away mise so that its all
// typescript", "use the package.json as the entry point like all typescript projects do". The plan
// that did it: .plans/done/tooling-in-typescript.md.
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
  // The check's parts by name, and the plans rule: hand tools.
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

/** Every command in one line each, for `remy help` (a command's own usage comes from running it without arguments). */
const what: Record<keyof typeof commands, string> = {
  status: 'what is going on: main, GitHub\'s verdicts, the deployments, worktrees, translations (npm run dev:status)',
  start: 'a worktree of your own from main, installed, its own ports, the guard (npm run dev:start -- <name>)',
  change: 'the check, in seconds, after every change (npm run dev:change)',
  land: 'the check, commit, main, push, staging, translations (npm run dev:land -- "<what changed>")',
  promote: 'production and the docs Worker, from a main GitHub passed (npm run dev:promote)',
  release: 'every check, Google, Core Web Vitals on a preview, the tag, the publish (npm run dev:release)',
  done: 'the worktree removed once its work is on main (npm run dev:done)',
  guard: 'register the flow\'s guard with the agents (--check: is it registered)',
  'guard-hook': 'the Claude PreToolUse hook the guard registers',
  allowed: 'may this heavy command run now (the gate the flow sets)',
  check: 'the check, or one part: plans · single-copies · routes · types · unit · translations · docs',
  plans: 'the open plans and now.md (check · open <plan>)',
  i18n: 'messages and docs translations: check [messages|docs] [--list] · translate [messages|docs]',
  cloudflare: 'deploy [staging] · docs-deploy · preview [alias] [--keep] · preview-delete · versions · wait · smoke · urls',
  setup: 'npm ci, the pinned skills, the agents\' rules, MCP registration, the guard, the installation\'s checks (npm run setup)',
  verify: 'setup (the installation\'s checks) · doctor · tooling; alone: everything, inside the flow',
  skills: 'the pinned agent skills: install · list',
  mcp: 'MCP servers for Claude and Codex: register · verify · status',
  rules: 'the platform\'s rules block in AGENTS.md',
  packages: 'check · upgrade · pack · notes · bumped · publish [--dry-run] · tag · release (npm run packages -- …)',
  app: 'dev · build · preview, the app itself (npm run dev|build|preview)',
  test: 'every · quick · only <words> · smoke · google · cwv · remote · live · consumers · report (npm run test -- …)',
  docs: 'the docs Worker: dev · build · check · test [remote] · preview · answers on|off · publish · questions · provision · init · observe',
  observe: 'logs and the AI Gateway of a Worker (npm run observe -- …)',
  shots: 'screenshots of every page in every language (npm run shots)',
  api: 'the API document: spec · coverage (npm run api -- …)',
  upgrade: 'this app onto a release of the platform: the package, the workflow\'s tag, skills, rules, the checks (npm run upgrade -- <version>)',
};

const [name = '', ...args] = process.argv.slice(2);
const load = commands[name];
if (!load) {
  // `remy help` (or no command, or an unknown one): every command, one line each; package.json's scripts are the everyday entry (npm run).
  const help = name === 'help' || name === '--help' || name === '-h';
  const out = help ? console.log : console.error;
  if (!help) out(`remy: ${name ? `no command "${name}".` : 'a command is needed.'} The flow, as npm run dev:<step>: status · start <name> · change · land "<what changed>" · promote · release · done.`);
  out(`${help ? 'remy <command> [args]' : 'Every command'} (npm run lists this app's scripts; a command run without arguments says its own):`);
  const width = Math.max(...Object.keys(what).map(key => key.length));
  for (const [command, line] of Object.entries(what)) out(`  ${command.padEnd(width)}  ${line}`);
  process.exit(help ? 0 : 2);
}
await configure();
await (await load()).main(args);
