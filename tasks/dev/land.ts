import { execFileSync } from 'node:child_process';
import { run, steps, where } from './flow.ts';

const message = process.argv.slice(2).join(' ').trim();
if (!message) { console.error('dev:land: say what changed: mise run dev:land -- "<message>"'); process.exit(1); }
const git = (...args: string[]) => execFileSync('git', args, { stdio: ['ignore', 'inherit', 'inherit'] });
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();

const here = where();
for (const task of steps.land.tasks) run(task, 'land');
if (!here.clean) git('add', '-A'), git('commit', '-q', '-m', message);
else console.log('dev:land: nothing to commit; landing what is committed.');

// A worktree lands on main by a fast-forward: the branch is on top of main or it is not landed.
if (!here.onMain) {
  const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
  const main = execFileSync('git', ['-C', root, 'merge', '--ff-only', here.branch], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  if (main) process.stdout.write(main);
  git('-C', root, 'push', 'origin', 'main');
  console.log(`dev:land: main is ${read('rev-parse', '--short', 'main')}, pushed; GitHub runs the heavy checks (gh run watch).`);
} else {
  git('push', 'origin', 'main');
}
// Staging first, always; production is a decision (dev:promote). The translation step runs on main.
if (process.env.STAGING_ORIGIN) run('cf:staging', 'land'); else console.log('dev:land: no STAGING_ORIGIN in [env]; nothing deployed.');
console.log('dev:land: done. GitHub: gh run list --limit 1. Production: mise run dev:promote.');
