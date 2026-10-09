import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// STEP 0 of the flow, for one agent or developer among many: a place of their own to work in.
// A worktree on a branch of its own from main, installed, with ports of its own and the flow's guard,
// so two people (or twenty agents) never build, serve or test in one checkout. Everything done by hand
// before (npm ci, the guard, a port picked from the air) is here, once.
const name = (process.argv[2] ?? '').trim();
if (!/^[a-z][a-z0-9-]{1,40}$/.test(name)) { console.error('dev:start: name the work: mise run dev:start -- <name> (lowercase letters, digits, dashes)'); process.exit(1); }
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const path = join(root, '.claude', 'worktrees', name);
if (existsSync(path)) { console.error(`dev:start: ${path} exists; mise run dev:done from it first, or choose another name`); process.exit(1); }

// From main as GitHub has it, so the work starts on what is landed.
execFileSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main']);
execFileSync('git', ['-C', root, 'worktree', 'add', '-q', path, '-b', name, 'origin/main'], { stdio: 'inherit' });

// Ports of this worktree's own, from its name (the same name, the same ports), never 4190, which
// browsers block: mise.local.toml is read by mise and ignored by git.
const seed = parseInt(createHash('sha256').update(name).digest('hex').slice(0, 6), 16);
const port = 4200 + (seed % 400) * 2;
writeFileSync(join(path, 'mise.local.toml'), `# Written by mise run dev:start -- ${name}: this worktree's own ports (never shared with another). Not committed.\n[env]\nPREVIEW_PORT = "${port}"\nDOCS_PREVIEW_PORT = "${port + 1}"\n`);

const run = (task: string, args: string[] = []) => {
  const result = spawnSync('mise', ['--cd', path, 'run', task, ...args], { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`dev:start: ${task} failed`); process.exit(result.status ?? 1); }
};
const npm = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd: path, stdio: 'inherit' });
if (npm.status !== 0) process.exit(npm.status ?? 1);
run('dev:guard');
console.log(`dev:start: ${name} is ready at ${path} (branch ${name} from main, ports ${port} and ${port + 1}).\nWork there: mise run dev:change after every change · mise run dev:land -- "<what changed>" to land · mise run dev:done when landed.`);
