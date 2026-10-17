import { commentOnCommit, repo } from './github.ts';
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { deploy, deployDocs, versions } from './cloudflare.ts';
import { describeRun, installed, latestRun, where } from './flow.ts';

export async function main(): Promise<void> {
  const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
  const here = where();
  if (!here.onMain) {
    console.error(`promote: production is deployed from main (this is ${here.branch}); vp run land first`);
    process.exit(1);
  }
  if (!here.clean) {
    console.error('promote: the tree has uncommitted changes; vp run land first');
    process.exit(1);
  }
  execFileSync('git', ['fetch', '-q', 'origin', 'main']);
  const head = read('rev-parse', 'HEAD');
  if (head !== read('rev-parse', 'origin/main')) {
    console.error('promote: main is not what GitHub has; vp run land first');
    process.exit(1);
  }
  // Production takes a commit GitHub's checks passed, never one they failed or have not finished.
  const checks = latestRun(head);
  if (checks === undefined) {
    console.error(
      'promote: cannot ask GitHub what its checks said (gh auth login); to deploy regardless, by hand: npx remy cloudflare deploy',
    );
    process.exit(1);
  }
  if (checks === null)
    console.log(
      `promote: GitHub has no run for ${head.slice(0, 7)} (no checks workflow?); promoting on staging alone.`,
    );
  else if (checks.status !== 'completed') {
    console.error(`promote: GitHub is still checking ${head.slice(0, 7)}: ${checks.url} (gh run watch)`);
    process.exit(1);
  } else if (checks.conclusion !== 'success') {
    console.error(
      `promote: GitHub's checks did not pass, ${describeRun(checks)}; fix that first (REMY_FLOW=hand npx remy test <level> reproduces it)`,
    );
    process.exit(1);
  } else console.log(`promote: GitHub's checks passed, ${describeRun(checks)}`);
  installed();
  await deploy();
  await deployDocs();
  console.log((await versions()).table);
  // The commit page says what went live (GitHub tells the commit's author); cf:versions stays the truth of now.
  const origin = process.env.DEPLOY_ORIGIN;
  if (origin) {
    const release = await fetch(`${origin}/healthz`, { cache: 'no-store' })
      .then((r) => r.json() as Promise<{ release?: string }>)
      .then((body) => body.release)
      .catch(() => undefined);
    const body = `Promoted to production: ${origin} serves this commit (Worker version ${release ?? 'unknown'})${process.env.DOCS_ORIGIN && existsSync('docs') ? `; docs: ${process.env.DOCS_ORIGIN}/dev` : ''}. Live now: vp run status.`;
    const slug = repo();
    const posted = slug ? commentOnCommit(slug, head, body) : false;
    console.log(
      posted
        ? `promote: written on the commit (${head.slice(0, 7)}).`
        : 'promote: could not write on the commit (gh); the deployments say what they run.',
    );
  }
}
