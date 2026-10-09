import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { describeRun, latestRun, run, where } from './flow.ts';

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
run('cf:deploy', 'promote');
if (existsSync('docs')) run('docs:deploy', 'promote');
run('cf:versions', 'promote');
