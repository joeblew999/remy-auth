import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describeRun, installed, latestRun, run, where } from './flow.ts';

const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const here = where();
if (!here.onMain) { console.error(`dev:promote: production is deployed from main (this is ${here.branch}); mise run dev:land first`); process.exit(1); }
if (!here.clean) { console.error('dev:promote: the tree has uncommitted changes; mise run dev:land first'); process.exit(1); }
execFileSync('git', ['fetch', '-q', 'origin', 'main']);
const head = read('rev-parse', 'HEAD');
if (head !== read('rev-parse', 'origin/main')) { console.error('dev:promote: main is not what GitHub has; mise run dev:land first'); process.exit(1); }
// Production takes a commit GitHub's checks passed, never one they failed or have not finished.
const checks = latestRun(head);
if (checks === undefined) { console.error('dev:promote: cannot ask GitHub what its checks said (gh auth login); to deploy regardless, by hand: mise run cf:deploy'); process.exit(1); }
if (checks === null) console.log(`dev:promote: GitHub has no run for ${head.slice(0, 7)} (no checks workflow?); promoting on staging alone.`);
else if (checks.status !== 'completed') { console.error(`dev:promote: GitHub is still checking ${head.slice(0, 7)}: ${checks.url} (gh run watch)`); process.exit(1); }
else if (checks.conclusion !== 'success') { console.error(`dev:promote: GitHub's checks did not pass, ${describeRun(checks)}; fix that first (mise run <the failed task> reproduces it, with REMY_FLOW=hand)`); process.exit(1); }
else console.log(`dev:promote: GitHub's checks passed, ${describeRun(checks)}`);
installed();
run('cf:deploy', 'promote');
if (existsSync('docs')) run('docs:deploy', 'promote');
run('cf:versions', 'promote');
// The commit page says what went live (GitHub tells the commit's author); cf:versions stays the truth of now.
const origin = process.env.DEPLOY_ORIGIN;
if (origin) {
  const release = await fetch(`${origin}/healthz`, { cache: 'no-store' }).then(r => r.json() as Promise<{ release?: string }>).then(body => body.release).catch(() => undefined);
  const body = `Promoted to production: ${origin} serves this commit (Worker version ${release ?? 'unknown'})${process.env.DOCS_ORIGIN && existsSync('docs') ? `; docs: ${process.env.DOCS_ORIGIN}/dev` : ''}. Live now: mise run cf:versions.`;
  const slug = spawnSync('gh', ['repo', 'view', '--json', 'nameWithOwner', '-q', '.nameWithOwner'], { encoding: 'utf8' }).stdout?.trim();
  const posted = slug ? spawnSync('gh', ['api', `repos/${slug}/commits/${head}/comments`, '-f', `body=${body}`], { stdio: 'ignore' }).status === 0 : false;
  console.log(posted ? `dev:promote: written on the commit (${head.slice(0, 7)}).` : 'dev:promote: could not write on the commit (gh); the deployments say what they run.');
}
