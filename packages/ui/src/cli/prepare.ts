import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import type { Landing } from './feedback.ts';
import { lap } from './timing.ts';
import { describeRun, latestRun, where } from './flow.ts';
import { remyCommand } from './config.ts';
import { translationGaps } from './i18n.ts';
import { releaseReady } from './packages.ts';

/** What prepare leaves for land (one landing's, in this checkout): whether it translated, whether the work came from main. */
export const preparedFile = () => join(process.cwd(), 'node_modules', '.cache', 'remy', 'land-prepared.json');

// `remy flow prepare land`, the first part of `vp run land` (its script: remy flow prepare land, then vp run ci, then
// remy flow land): what changes
// the files before Vite Plus checks them. The work moves off main to a branch of its own when it is on main; main is
// merged in (among many agents main moves under every branch, and what lands is the branch with main in it; a conflict
// stops here with the files named); then the translations this change made stale or missing, in the change. A failed
// translation does not stop the landing (the English is the source): it is still owed, and land's last line says so.
// Uncommitted work is committed as it comes in ("work in progress"): the pull request is squash-merged under land's
// message, so no commit of the branch's survives on main.
export async function main(args: string[]): Promise<void> {
  const [step] = args;
  if (step === 'release') return prepareRelease();
  if (step !== 'land') {
    console.error('remy flow prepare land|release');
    process.exit(2);
  }
  process.env.REMY_FLOW = 'land';
  const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
  const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const fail = (line: string): never => {
    console.error(`prepare: ${line}`);
    process.exit(1);
  };
  const here = where();
  const fromMain = here.onMain;
  // Landing on a red main is allowed (the fix is a landing too) and never silent.
  const mainRun = latestRun();
  if (mainRun && mainRun.status === 'completed' && mainRun.conclusion !== 'success')
    console.log(
      `prepare: main is RED, ${describeRun(mainRun)}. Landing on it anyway; if this is not the fix, somebody's is owed.`,
    );
  execFileSync('git', ['fetch', '-q', 'origin', 'main']);
  if (here.onMain) {
    if (here.clean && read('rev-list', '--count', 'origin/main..HEAD') === '0')
      fail('nothing to land: main is clean and on origin/main.');
    const branch = `land/${new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, '').toLowerCase()}`;
    git('switch', '-q', '-c', branch);
    console.log(`prepare: the work moves from main to ${branch}, which lands through a pull request.`);
    Object.assign(here, { branch, onMain: false });
  }
  if (read('rev-list', '--count', `${here.branch}..origin/main`) !== '0') {
    if (!here.clean) {
      git('add', '-A');
      git('commit', '-q', '-m', 'Work in progress');
    }
    const merged = spawnSync('git', ['merge', '-q', 'origin/main', '-m', `Merge main into ${here.branch}`], {
      stdio: 'inherit',
    });
    if (merged.status !== 0)
      fail(`main does not merge cleanly into ${here.branch}; resolve the files git names, commit, then land again`);
    lap('main merged in');
  }
  let translation: Landing['translation'] = 'up to date';
  if ((await translationGaps()).length === 0) console.log('prepare: translations are up to date.');
  else {
    const [remy, ...remyArgs] = remyCommand();
    translation =
      spawnSync(remy!, [...remyArgs, 'i18n', 'translate'], { stdio: 'inherit' }).status === 0 ? 'done' : 'failed';
    lap(translation === 'done' ? 'translation' : 'translation, failed');
  }
  mkdirSync(dirname(preparedFile()), { recursive: true });
  writeFileSync(preparedFile(), `${JSON.stringify({ translation, fromMain })}\n`);
}

// The first part of `vp run release` (its script: remy flow prepare release, then vp run ci, then remy flow release):
// what would stop the release, found before the checks run: a clean main, complete translations, bumped versions.
async function prepareRelease(): Promise<void> {
  const here = where();
  if (!here.onMain || !here.clean) {
    console.error(
      `prepare: a release is made from a clean main (this is ${here.branch}${here.clean ? '' : ', with changes'}); vp run land first`,
    );
    process.exit(1);
  }
  await releaseReady();
}
