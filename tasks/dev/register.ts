import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const check = process.argv.includes('--check') || process.env.usage_check === 'true';
const mise = execFileSync('which', ['mise'], { encoding: 'utf8' }).trim();
// The hook runs the guard through mise, so it finds the tasks wherever they are (this repo, or a
// consumer's include cache) and Node as mise pins it.
const command = (task: string) => `${mise} --cd ${JSON.stringify(process.cwd())} --quiet run ${task}`;
const hook = { type: 'command', command: command('dev:guard-hook') };
// Every session opens with what is going on (dev:status): the hook's output is the agent's first context.
const start = { hooks: [{ type: 'command', command: command('dev:status') }] };
const file = '.claude/settings.json';
type Settings = { hooks?: Record<string, { matcher?: string; hooks: { type: string; command: string }[] }[]> } & Record<string, unknown>;
const settings: Settings = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
settings.hooks ??= {};
const pre = settings.hooks.PreToolUse ??= [];
const ours = pre.find(entry => entry.hooks.some(h => h.command.endsWith('run dev:guard-hook')));
const wanted = { matcher: 'Bash', hooks: [hook] };
const session = settings.hooks.SessionStart ??= [];
const oursStart = session.find(entry => entry.hooks.some(h => h.command.endsWith('run dev:status')));
const same = ours && JSON.stringify(ours) === JSON.stringify(wanted) && oursStart && JSON.stringify(oursStart) === JSON.stringify(start);
if (check) {
  if (!same) { console.error(`${file}: the flow's guard and status hooks are not registered; mise run dev:guard`); process.exit(1); }
  console.log(`${file}: the flow's guard and status hooks are registered.`);
} else if (!same) {
  if (ours) pre.splice(pre.indexOf(ours), 1, wanted); else pre.push(wanted);
  if (oursStart) session.splice(session.indexOf(oursStart), 1, start); else session.push(start);
  mkdirSync(dirname(join(process.cwd(), file)), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  console.log(`${file}: the flow's guard (PreToolUse on Bash) and status (SessionStart) hooks are registered.`);
} else console.log(`${file}: the flow's hooks were already registered.`);
