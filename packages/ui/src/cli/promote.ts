// `remy promote check` and `remy promote done`: the two ends of putting main in production. The deploys between them
// are named in the promote script, where they can be read:
//
//   remy promote check && remy cloudflare deploy && remy cloudflare docs-deploy && remy promote done
//
// The owner's word starts it (production is the owner's); each end does its own job and nothing else.
import { execFileSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { versions } from './cloudflare.ts';
import { docsDir, origins } from './config.ts';
import { commentOnCommit, repo } from './github.ts';
import { describeRun, latestRun, where } from './status.ts';

const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
function fail(line: string): never {
  console.error(`promote: ${line}`);
  process.exit(1);
}

/** What production may take: a clean main, exactly what GitHub has, whose checks GitHub passed. */
export function check(): void {
  const here = where();
  if (!here.onMain) fail(`production is deployed from main (this is ${here.branch}); vp run land first.`);
  if (!here.clean) fail('the tree has uncommitted changes; vp run land first.');
  execFileSync('git', ['fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main']);
  const head = read('rev-parse', 'HEAD');
  if (head !== read('rev-parse', 'origin/main')) fail('main is not what GitHub has; vp run land first.');
  const checks = latestRun(head);
  if (checks === undefined)
    fail(
      'cannot ask GitHub what its checks said (gh auth login); to deploy regardless, by hand: npx remy cloudflare deploy.',
    );
  if (checks === null)
    fail(`GitHub has no run for ${head.slice(0, 7)}: production takes only a commit its checks passed.`);
  if (checks.status !== 'completed')
    fail(`GitHub is still checking ${head.slice(0, 7)}: ${checks.url} (gh run watch).`);
  if (checks.conclusion !== 'success')
    fail(`GitHub's checks did not pass, ${describeRun(checks)}; fix that first (vp run ci reproduces it here).`);
  console.log(`promote: GitHub's checks passed, ${describeRun(checks)}`);
}

/** What went live, from the deployments themselves, and the same written on the commit (GitHub tells its author). */
export async function done(): Promise<void> {
  console.log((await versions()).table);
  const origin = origins().production;
  if (!origin) return;
  const head = read('rev-parse', 'HEAD');
  const release = await fetch(`${origin}/healthz`, { cache: 'no-store' })
    .then((response) => response.json() as Promise<{ release?: string }>)
    .then((body) => body.release)
    .catch(() => undefined);
  const docs = origins().docs && docsDir() ? `; docs: ${origins().docs}/dev` : '';
  const body = `Promoted to production: ${origin} serves this commit (Worker version ${release ?? 'unknown'})${docs}. Live now: vp run status.`;
  const slug = repo();
  const posted = slug ? commentOnCommit(slug, head, body) : false;
  console.log(
    posted ? `promote: written on the commit (${head.slice(0, 7)}).` : 'promote: could not write on the commit (gh).',
  );
}

export const what = "production's two ends, around the deploys (vp run promote runs both)";
export const commands: Subcommands = {
  check: { what: 'a clean main, exactly what GitHub has, whose checks GitHub passed', run: () => check() },
  done: { what: 'what each deployment runs now, and the same written on the commit', run: () => done() },
};
export const main = dispatch('promote', commands);
