import { execFileSync, spawnSync } from 'node:child_process';
import { ended, span, type Landing } from './feedback.ts';
import { lap, laps } from './timing.ts';
import { check } from './check.ts';
import { describeRun, latestRun, where } from './flow.ts';
import { remyCommand } from './config.ts';
import { translationGaps } from './i18n.ts';

export async function main(args: string[]): Promise<void> {

// The land step, in order, each part once: main merged in; the translations this change made stale or
// missing (a Claude agent on this machine, only the sections and keys whose English changed, seconds);
// the check; one commit with the English and its translations; fast-forward main and push it once
// (GitHub takes it from there); deploy staging; bring main back to the branch. Production is
// dev:promote. It says what each part took, and when staging was up: a slow landing is a number, not a
// feeling. (Until 2026-10-17 translation ran on main after the push, as a second commit and a second
// push: every landing that touched docs ran GitHub's checks twice and waited for both.)
const message = args.join(' ').trim();
if (!message) { console.error('dev:land: say what changed: npm run dev:land -- "<message>"'); process.exit(1); }
const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

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
// Translation, in the change: only when something is stale or missing, so a landing that changed no
// English costs nothing here. A failed translation does not stop the landing (the English is the source);
// it is still owed, the check warns, and the last line says so.
let translation: Landing['translation'] = 'up to date';
if ((await translationGaps()).length === 0) console.log('dev:land: translations are up to date.');
else {
  const [remy, ...remyArgs] = remyCommand();
  translation = spawnSync(remy!, [...remyArgs, 'i18n', 'translate'], { stdio: 'inherit', env: { ...process.env, REMY_FLOW: 'land' } }).status === 0 ? 'done' : 'failed';
  lap(translation === 'done' ? 'translation' : 'translation, failed');
}
await check();
lap('the check');
// Asked of git again: the translation may have written files in a checkout that was clean.
if (read('status', '--porcelain') !== '') { git('add', '-A'); git('commit', '-q', '-m', message); }
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

// Staging now, so the landing is usable in a minute. A staging failure (the deploy or its live smoke)
// does not undo the landing: main is pushed already; the last line says the whole state and the step
// ends non-zero.
const [remy, ...remyArgs] = remyCommand();
const staging: Landing['staging'] = !process.env.STAGING_ORIGIN ? 'none' : spawnSync(remy!, [...remyArgs, 'cloudflare', 'staging'], { stdio: 'inherit' }).status === 0 ? 'up' : 'failed';
lap('staging');
if (staging === 'up') console.log(`dev:land: staging is up, ${span(laps().reduce((sum, part) => sum + part.ms, 0))} after the start. Production: npm run dev:promote.`);
else if (staging === 'none') console.log('dev:land: no origins.staging in remy.config.ts; nothing deployed.');
else console.error('dev:land: staging failed (the lines above say whether the deploy or the live smoke); main is pushed; the last line says the state.');

if (!here.onMain) git('merge', '-q', '--ff-only', 'main');
const end = ended({ commit: landed, staging, translation }, laps());
if (end.failed) { console.error(end.line); process.exit(1); }
console.log(end.line);
}
