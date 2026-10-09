import { execFileSync, spawnSync } from 'node:child_process';
import { installed } from './flow.ts';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { basename, join } from 'node:path';

// STEP 0 of the flow, for one agent or developer among many: a place of their own to work in, ready.
// A worktree on a branch of its own from main, installed (npm, the app's local state through
// project:prepare), with ports of its own and the flow's guard, so two people or twenty agents never
// build, serve or test in one checkout. Idempotent: a worktree that exists (Claude Code makes its own
// at the same place, .claude/worktrees/<name>, and only the folder) is prepared, not refused; from
// inside a worktree, no name means this one. Everything done by hand before is here, once.
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const top = read('rev-parse', '--show-toplevel');
const given = (process.argv[2] ?? '').trim();
const inWorktree = top !== root;
const name = given || (inWorktree ? basename(top) : '');
if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) { console.error('dev:start: name the work: mise run dev:start -- <name> (lowercase letters, digits, dashes), or run it inside a worktree'); process.exit(1); }
const path = given ? join(root, '.claude', 'worktrees', name) : top;

const worktrees = read('-C', root, 'worktree', 'list', '--porcelain');
if (!worktrees.includes(`worktree ${path}\n`)) {
  if (existsSync(path)) { console.error(`dev:start: ${path} exists but is not a worktree; remove it or choose another name`); process.exit(1); }
  // From main as GitHub has it, so the work starts on what is landed.
  execFileSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main']);
  execFileSync('git', ['-C', root, 'worktree', 'add', '-q', path, '-b', name, 'origin/main'], { stdio: 'inherit' });
  console.log(`dev:start: made ${path} on branch ${name} from main.`);
} else console.log(`dev:start: preparing the worktree at ${path}.`);

// Ports of this worktree's own, from its name (the same name, the same ports), never 4190, which
// browsers block: mise.local.toml is read by mise and ignored by git.
const seed = parseInt(createHash('sha256').update(name).digest('hex').slice(0, 6), 16);
const port = 4200 + (seed % 400) * 2;
writeFileSync(join(path, 'mise.local.toml'), `# Written by mise run dev:start (${name}): this worktree's own ports, never shared with another. Not committed.\n[env]\nPREVIEW_PORT = "${port}"\nDOCS_PREVIEW_PORT = "${port + 1}"\n`);

const run = (task: string) => {
  const result = spawnSync('mise', ['--cd', path, 'run', task], { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`dev:start: ${task} failed`); process.exit(result.status ?? 1); }
};
installed(path);
// The app's local state (remy-auth: .dev.vars, the local databases, the guard's oRPC v1 fixture).
run('project:prepare');
run('dev:guard');
console.log(`dev:start: ${name} is ready at ${path} (ports ${port} and ${port + 1}).\nWork there: mise run dev:change after every change · mise run dev:land -- "<what changed>" to land · mise run dev:done when landed.`);
