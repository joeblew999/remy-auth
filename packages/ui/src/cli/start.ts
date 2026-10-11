import { execFileSync, spawnSync } from 'node:child_process';
import { installed } from './flow.ts';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { portsFor, remyCommand } from './config.ts';

export function main(args: string[]): void {

// STEP 0 of the flow, for one agent or developer among many: a place of their own to work in, ready.
// A worktree on a branch of its own from main, installed (npm, the app's local state through
// project:prepare), with ports of its own and the flow's guard, so two people or twenty agents never
// build, serve or test in one checkout. Idempotent: a worktree that exists (Claude Code makes its own
// at the same place, .claude/worktrees/<name>, and only the folder) is prepared, not refused; from
// inside a worktree, no name means this one. Everything done by hand before is here, once.
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const top = read('rev-parse', '--show-toplevel');
const given = (args[0] ?? '').trim();
const inWorktree = top !== root;
const name = given || (inWorktree ? basename(top) : '');
if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) { console.error('dev:start: name the work: npm run dev:start -- <name> (lowercase letters, digits, dashes), or run it inside a worktree'); process.exit(1); }
const path = given ? join(root, '.claude', 'worktrees', name) : top;

const worktrees = read('-C', root, 'worktree', 'list', '--porcelain');
if (!worktrees.includes(`worktree ${path}\n`)) {
  if (existsSync(path)) { console.error(`dev:start: ${path} exists but is not a worktree; remove it or choose another name`); process.exit(1); }
  // From main as GitHub has it, so the work starts on what is landed.
  execFileSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main']);
  execFileSync('git', ['-C', root, 'worktree', 'add', '-q', path, '-b', name, 'origin/main'], { stdio: 'inherit' });
  console.log(`dev:start: made ${path} on branch ${name} from main.`);
} else console.log(`dev:start: preparing the worktree at ${path}.`);

// Ports of this worktree's own, from its name (config.ts: the same name, the same ports), computed by every step.
const { preview: port } = portsFor(name);

installed(path);
// The app's local state (its "local" script, when it has one: remy-auth's .dev.vars, local databases, the guard's fixture).
const local = spawnSync('npm', ['run', '--if-present', '--silent', 'local'], { cwd: path, stdio: 'inherit' });
if (local.status !== 0) { console.error('dev:start: the local script failed'); process.exit(local.status ?? 1); }
// The flow's hooks for this worktree's agents, through its own bin.
const [remy, ...rest] = remyCommand(path);
const guard = spawnSync(remy!, [...rest, 'guard'], { cwd: path, stdio: 'inherit' });
if (guard.status !== 0) { console.error('dev:start: remy guard failed'); process.exit(guard.status ?? 1); }
console.log(`dev:start: ${name} is ready at ${path} (ports ${port} and ${port + 1}).\nWork there: npm run dev:change after every change · npm run dev:land -- "<what changed>" to land · npm run dev:done when landed.`);
}
