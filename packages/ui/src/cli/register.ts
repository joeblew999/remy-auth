import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { remyCommand } from './config.ts';

// `remy guard`: register the flow's hooks for this checkout's agents (.claude/settings.json, not
// committed): PreToolUse on Bash runs the guard (guard-hook.ts); SessionStart runs `remy flow status`, so
// every session opens with what is going on. `--check` only says whether they are registered.
// The commands name this checkout's own remy (remyCommand), so a worktree's hooks run in the worktree.
export const what = "register the flow's guard and the status hook with Claude (--check: is it registered)";
export function main(args: string[]): void {
  const check = args.includes('--check') || process.env.usage_check === 'true';
  const command = (name: string) => `${remyCommand().map(part => JSON.stringify(part)).join(' ')} ${name}`;
  const hook = { type: 'command', command: command('guard-hook') };
  const start = { hooks: [{ type: 'command', command: command('flow status') }] };
  const file = '.claude/settings.json';
  type Settings = { hooks?: Record<string, { matcher?: string; hooks: { type: string; command: string }[] }[]> } & Record<string, unknown>;
  const settings: Settings = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  settings.hooks ??= {};
  const pre = settings.hooks.PreToolUse ??= [];
  const ours = pre.find(entry => entry.hooks.some(h => /(run dev:guard-hook| guard-hook)$/.test(h.command)));
  const wanted = { matcher: 'Bash', hooks: [hook] };
  const session = settings.hooks.SessionStart ??= [];
  const oursStart = session.find(entry => entry.hooks.some(h => /(run dev:status| status)$/.test(h.command)));
  const same = ours && JSON.stringify(ours) === JSON.stringify(wanted) && oursStart && JSON.stringify(oursStart) === JSON.stringify(start);
  if (check) {
    if (!same) { console.error(`${file}: the flow's guard and status hooks are not registered; node_modules/.bin/remy guard`); process.exit(1); }
    console.log(`${file}: the flow's guard and status hooks are registered.`);
  } else if (!same) {
    if (ours) pre.splice(pre.indexOf(ours), 1, wanted); else pre.push(wanted);
    if (oursStart) session.splice(session.indexOf(oursStart), 1, start); else session.push(start);
    mkdirSync(dirname(join(process.cwd(), file)), { recursive: true });
    writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
    console.log(`${file}: the flow's guard (PreToolUse on Bash) and status (SessionStart) hooks are registered.`);
  } else console.log(`${file}: the flow's hooks were already registered.`);
}
