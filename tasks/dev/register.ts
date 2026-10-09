import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

const check = process.argv.includes('--check') || process.env.usage_check === 'true';
const mise = execFileSync('which', ['mise'], { encoding: 'utf8' }).trim();
// The hook runs the guard through mise, so it finds the tasks wherever they are (this repo, or a
// consumer's include cache) and Node as mise pins it.
const hook = { type: 'command', command: `${mise} --cd ${JSON.stringify(process.cwd())} --quiet run dev:guard-hook` };
const file = '.claude/settings.json';
type Settings = { hooks?: Record<string, { matcher?: string; hooks: { type: string; command: string }[] }[]> } & Record<string, unknown>;
const settings: Settings = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
settings.hooks ??= {};
const pre = settings.hooks.PreToolUse ??= [];
const ours = pre.find(entry => entry.hooks.some(h => h.command.endsWith('run dev:guard-hook')));
const wanted = { matcher: 'Bash', hooks: [hook] };
const same = ours && JSON.stringify(ours) === JSON.stringify(wanted);
if (check) {
  if (!same) { console.error(`${file}: the flow's guard is not registered; mise run dev:guard`); process.exit(1); }
  console.log(`${file}: the flow's guard is registered.`);
} else if (!same) {
  if (ours) pre.splice(pre.indexOf(ours), 1, wanted); else pre.push(wanted);
  mkdirSync(dirname(join(process.cwd(), file)), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  console.log(`${file}: the flow's guard is registered (PreToolUse on Bash).`);
} else console.log(`${file}: the flow's guard was already registered.`);
