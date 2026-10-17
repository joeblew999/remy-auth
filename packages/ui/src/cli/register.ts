import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { remyCommand } from './config.ts';

// `remy hooks`: the one Claude hook this checkout's agents get (.claude/settings.local.json, this machine's, not
// committed): SessionStart runs `remy status`, so every session opens with what is going on. `--check` only says
// whether it is registered. The command names this checkout's own remy (remyCommand), so a worktree's hook runs in
// the worktree. The flow's guard (a PreToolUse hook that refused commands outside the flow) is gone: Vite Plus's cache
// made rerunning cheap, and what is left costly is run by name from a script (owner, 2026-10-17); a machine that still
// has it registered loses it here.
export const what = 'register the status hook with Claude, so each session opens with remy status (--check: is it)';
export function main(args: string[]): void {
  const check = args.includes('--check');
  const start = {
    hooks: [
      {
        type: 'command',
        command: `${remyCommand()
          .map((part) => JSON.stringify(part))
          .join(' ')} status`,
      },
    ],
  };
  const file = '.claude/settings.local.json';
  type Entry = { matcher?: string; hooks: { type: string; command: string }[] };
  type Settings = { hooks?: Record<string, Entry[]> } & Record<string, unknown>;
  const settings: Settings = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : {};
  settings.hooks ??= {};
  const ours = (entry: Entry, pattern: RegExp) => entry.hooks.some((hook) => pattern.test(hook.command));
  const guard = (settings.hooks.PreToolUse ?? []).filter((entry) => ours(entry, / guard-hook$/));
  const session = (settings.hooks.SessionStart ??= []);
  const existing = session.find((entry) => ours(entry, / (flow )?status$/));
  const same = !guard.length && existing && JSON.stringify(existing) === JSON.stringify(start);
  if (check) {
    if (!same) {
      console.error(`${file}: the status hook is not registered as it should be; npx remy hooks`);
      process.exit(1);
    }
    return console.log(`${file}: the status hook is registered.`);
  }
  if (same) return console.log(`${file}: the status hook was already registered.`);
  if (guard.length) {
    settings.hooks.PreToolUse = settings.hooks.PreToolUse!.filter((entry) => !guard.includes(entry));
    if (!settings.hooks.PreToolUse.length) delete settings.hooks.PreToolUse;
  }
  if (existing) session.splice(session.indexOf(existing), 1, start);
  else session.push(start);
  mkdirSync(dirname(join(process.cwd(), file)), { recursive: true });
  writeFileSync(file, JSON.stringify(settings, null, 2) + '\n');
  console.log(
    `${file}: the status hook (SessionStart) is registered${guard.length ? '; the old guard hook removed' : ''}.`,
  );
}
