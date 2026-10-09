import { execFileSync, spawnSync } from 'node:child_process';
import { where } from './flow.ts';

// The last step for a worktree: once its branch is landed (merged into main), the worktree and the
// branch go (how we work: branches are short-lived, deleted after merge). Refuses while anything is
// not landed, so nothing is lost; the shell that ran this is left in a folder that no longer exists.
const here = where();
if (here.onMain) { console.error('dev:done: this is main, not a worktree; nothing to remove'); process.exit(1); }
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
const path = read('rev-parse', '--show-toplevel');
if (!here.clean) { console.error(`dev:done: ${here.branch} has uncommitted changes; mise run dev:land -- "<what changed>" first`); process.exit(1); }
const unlanded = read('-C', root, 'rev-list', '--count', `main..${here.branch}`);
if (unlanded !== '0') { console.error(`dev:done: ${here.branch} has ${unlanded} commit(s) main does not; mise run dev:land first`); process.exit(1); }
const result = spawnSync('git', ['-C', root, 'worktree', 'remove', '--force', path], { stdio: 'inherit' });
if (result.status !== 0) process.exit(result.status ?? 1);
execFileSync('git', ['-C', root, 'branch', '-d', here.branch], { stdio: 'inherit' });
console.log(`dev:done: ${here.branch} is landed and gone; main is ${read('-C', root, 'rev-parse', '--short', 'main')}. Next piece of work: mise run dev:start -- <name>.`);
