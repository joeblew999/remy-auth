import { execFileSync, spawnSync } from 'node:child_process';
import { run, steps, where } from './flow.ts';

// The land step, in order, each part once: the check; commit what changed; fast-forward main and
// push it (GitHub takes it from there); translate on main only when the check says a translation is
// stale or missing (the one writer, a Claude agent on this machine, minutes; it commits, and that is
// pushed too); bring main back to the branch; deploy staging. Production is dev:promote.
const message = process.argv.slice(2).join(' ').trim();
if (!message) { console.error('dev:land: say what changed: mise run dev:land -- "<message>"'); process.exit(1); }
const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const task = (name: string, cwd = '.') => spawnSync('mise', ['run', name], { cwd, stdio: 'inherit', env: { ...process.env, REMY_FLOW: 'land' } }).status === 0;

const here = where();
for (const name of steps.land.tasks) run(name, 'land');
if (!here.clean) { git('add', '-A'); git('commit', '-q', '-m', message); }
else console.log('dev:land: nothing new to commit; landing what is committed.');

// The checkout main lives in: this one on main, the main worktree from a branch worktree.
const root = here.onMain ? '.' : read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
if (!here.onMain) {
  // A branch lands by a fast-forward: it is on top of main, or it is not landed (merge main first).
  const result = spawnSync('git', ['-C', root, 'merge', '--ff-only', here.branch], { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`dev:land: ${here.branch} is not on top of main; merge main into it, then land again`); process.exit(1); }
}
git('-C', root, 'push', 'origin', 'main');
const landed = read('-C', root, 'rev-parse', 'main');
console.log(`dev:land: main is ${landed.slice(0, 7)} and pushed; GitHub runs every language, Google's audits and the consumer fixture: gh run list --commit ${landed.slice(0, 7)}. A red run comments on the commit; dev:promote refuses one that is not green.`);

// Translation: only when something is stale or missing (strict check: exit 1 says so), so a second
// land after a green one costs nothing here.
const upToDate = spawnSync('mise', ['run', 'i18n:check'], { cwd: root, stdio: 'ignore', env: { ...process.env, I18N_STRICT: '1' } }).status === 0;
if (upToDate) console.log('dev:land: translations are up to date.');
else {
  const before = read('-C', root, 'rev-parse', 'main');
  if (!task('i18n:translate', root)) { console.error('dev:land: translation failed; main is pushed, staging is not deployed'); process.exit(1); }
  if (read('-C', root, 'rev-parse', 'main') !== before) git('-C', root, 'push', 'origin', 'main');
}
if (!here.onMain) git('merge', '-q', '--ff-only', 'main');

if (process.env.STAGING_ORIGIN) run('cf:staging', 'land'); else console.log('dev:land: no STAGING_ORIGIN in [env]; nothing deployed.');
console.log('dev:land: done. Production: mise run dev:promote.');
