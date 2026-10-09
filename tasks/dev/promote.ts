import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { run, where } from './flow.ts';

const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8' }).trim();
const here = where();
if (!here.onMain) { console.error(`dev:promote: production is deployed from main (this is ${here.branch}); mise run dev:land first`); process.exit(1); }
if (!here.clean) { console.error('dev:promote: the tree has uncommitted changes; mise run dev:land first'); process.exit(1); }
execFileSync('git', ['fetch', '-q', 'origin', 'main']);
if (read('rev-parse', 'HEAD') !== read('rev-parse', 'origin/main')) { console.error('dev:promote: main is not what GitHub has; mise run dev:land first'); process.exit(1); }
run('cf:deploy', 'promote');
if (existsSync('docs')) run('docs:deploy', 'promote');
run('cf:versions', 'promote');
