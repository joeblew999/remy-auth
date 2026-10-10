import { execFileSync, spawnSync } from 'node:child_process';
import { ended, span, type Landing, type Part } from './feedback.ts';
import { describeRun, latestRun, run, steps, where } from './flow.ts';

// The land step, in order, each part once: the check; commit what changed; fast-forward main and
// push it (GitHub takes it from there); deploy staging; translate on main, last, only when the check
// says a translation is stale or missing (the one writer, a Claude agent on this machine, minutes; it
// commits, and that is pushed too); bring main back to the branch. Production is dev:promote. It says
// what each part took, and when staging was up: a slow landing is a number, not a feeling.
const message = process.argv.slice(2).join(' ').trim();
if (!message) { console.error('dev:land: say what changed: mise run dev:land -- "<message>"'); process.exit(1); }
const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const task = (name: string, cwd = '.') => spawnSync('mise', ['run', name], { cwd, stdio: 'inherit', env: { ...process.env, REMY_FLOW: 'land' } }).status === 0;
const parts: Part[] = []; let mark = Date.now();
const lap = (what: string) => { const now = Date.now(); parts.push({ what, ms: now - mark }); mark = now; };

const here = where();
// Landing on a red main is allowed (the fix is a landing too) and never silent.
const mainRun = latestRun();
if (mainRun && mainRun.status === 'completed' && mainRun.conclusion !== 'success') console.log(`dev:land: main is RED, ${describeRun(mainRun)}. Landing on it anyway; if this is not the fix, somebody's is owed.`);
// Among many agents main moves under every branch. What is landed is the branch with main in it, so
// main comes in first (a merge; a conflict stops here with the files named), and the check runs on that.
if (!here.onMain) {
  execFileSync('git', ['fetch', '-q', 'origin', 'main']);
  if (read('rev-list', '--count', `${here.branch}..origin/main`) !== '0') {
    if (!here.clean) { git('add', '-A'); git('commit', '-q', '-m', message); }
    const merged = spawnSync('git', ['merge', '-q', 'origin/main', '-m', `Merge main into ${here.branch}`], { stdio: 'inherit' });
    if (merged.status !== 0) { console.error(`dev:land: main does not merge cleanly into ${here.branch}; resolve the files git names, commit, then land again`); process.exit(1); }
    here.clean = true;
  }
}
for (const name of steps.land.tasks) run(name, 'land');
lap('the check');
if (!here.clean) { git('add', '-A'); git('commit', '-q', '-m', message); }
else console.log('dev:land: nothing new to commit; landing what is committed.');

// The checkout main lives in: this one on main, the main worktree from a branch worktree.
const root = here.onMain ? '.' : read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
if (!here.onMain) {
  // A branch lands by a fast-forward: with main merged in above, it is on top of main.
  execFileSync('git', ['-C', root, 'merge', '-q', '--ff-only', 'origin/main']);
  const result = spawnSync('git', ['-C', root, 'merge', '--ff-only', here.branch], { stdio: 'inherit' });
  if (result.status !== 0) { console.error(`dev:land: ${here.branch} is not on top of main (another landing came between); land again`); process.exit(1); }
}
git('-C', root, 'push', 'origin', 'main');
lap('commit, main and push');
const landed = read('-C', root, 'rev-parse', 'main');
console.log(`dev:land: main is ${landed.slice(0, 7)} and pushed; GitHub runs every language, Google's audits and the consumer fixture: gh run list --commit ${landed}. A red run comments on the commit; dev:promote refuses one that is not green.`);

// Staging now, so the landing is usable in a minute; the translation (the Claude subscription on this
// machine, minutes for a few pages) comes last and nobody waits for it. A staging failure (the deploy
// or its live smoke) does not stop the landing: main is pushed already and the translation is owed
// regardless; the last line says the whole state and the step ends non-zero.
const staging: Landing['staging'] = !process.env.STAGING_ORIGIN ? 'none' : task('cf:staging') ? 'up' : 'failed';
lap('staging');
if (staging === 'up') console.log(`dev:land: staging is up, ${span(parts.reduce((sum, part) => sum + part.ms, 0))} after the start. Production: mise run dev:promote.`);
else if (staging === 'none') console.log('dev:land: no STAGING_ORIGIN in [env]; nothing deployed.');
else console.error('dev:land: staging failed (the lines above say whether the deploy or the live smoke); main is pushed, so the translation runs now and the last line says the state.');

// Translation, last: only when something is stale or missing (strict check: exit 1 says so), so a
// second land after a green one costs nothing here. It commits on main and is pushed.
const upToDate = spawnSync('mise', ['run', 'i18n:check'], { cwd: root, stdio: 'ignore', env: { ...process.env, I18N_STRICT: '1' } }).status === 0;
let translation: Landing['translation'] = 'up to date';
if (upToDate) { lap('translation check'); console.log('dev:land: translations are up to date.'); }
else {
  const before = read('-C', root, 'rev-parse', 'main');
  if (task('i18n:translate', root)) {
    if (read('-C', root, 'rev-parse', 'main') !== before) git('-C', root, 'push', 'origin', 'main');
    lap('translation'); translation = 'done';
  } else { lap('translation, failed'); translation = 'failed'; }
}
if (!here.onMain) git('merge', '-q', '--ff-only', 'main');
const end = ended({ commit: landed, staging, translation }, parts);
if (end.failed) { console.error(end.line); process.exit(1); }
console.log(end.line);
