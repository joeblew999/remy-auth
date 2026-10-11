// The browser checks (`remy test …`), each what a step, GitHub or a hand that said so runs; the gate
// (allowed.ts) refuses the heavy ones outside the flow. Level 1 is every check of ours; level 2 is
// Google's. `only <words>` is the one browser run a step does not own: the checks whose title matches,
// in the quick languages.
import { spawnSync } from 'node:child_process';
import { mkdirSync, rmdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gate } from './allowed.ts';
import { preview, previewDelete } from './cloudflare.ts';
import { build } from './dev.ts';

function playwright(args: string[], env: Record<string, string>): void {
  const result = spawnSync(join(process.cwd(), 'node_modules', '.bin', 'playwright'), ['test', ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const local = { TEST_TARGET: 'local' };
const quickLocales = () => ({ CHECK_LOCALES: process.env.CHECK_LOCALES ?? process.env.QUICK_LOCALES ?? 'en,ar' });
const remote = (origin = process.env.TEST_BASE_URL ?? process.env.DEPLOY_ORIGIN) => {
  if (!origin) { console.error('test: pass TEST_BASE_URL, or put origins.production in remy.config.ts'); process.exit(1); }
  return { TEST_TARGET: 'remote', TEST_BASE_URL: origin };
};

/** One speed measurement at a time on this machine (Google's level): a second run waits for the lock rather than skewing the first. */
async function withLevel2Lock<T>(work: () => T): Promise<T> {
  const lock = join(tmpdir(), 'remy-level2.lock');
  for (let waited = 0; ; waited++) {
    try { mkdirSync(lock); break; } catch { if (waited === 0) console.log('test: another speed measurement runs on this machine; waiting for it.'); await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  try { return work(); } finally { try { rmdirSync(lock); } catch { /* gone */ } }
}

/** Every check of ours in every language (level 1), on the production artifact in local Workers. */
export function every(): void { gate('project:test'); build(); playwright(['--project=ours'], local); }
/** Every check in the quick languages. */
export function quick(): void { gate('project:test:quick'); build(); playwright(['--project=ours'], { ...local, ...quickLocales() }); }
/** The checks whose title matches, in the quick languages: the one browser run a step does not own. */
export function only(words: string): void { build(); playwright(['--project=ours', '--grep', words], { ...local, ...quickLocales() }); }
/** The smoke checks alone, on a local build. */
export function smoke(): void { build(); playwright(['--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], local); }
/** Google's audits (level 2), locally. */
export async function google(): Promise<void> { gate('project:test:google'); build(); await withLevel2Lock(() => playwright(['--project=google'], local)); }
/** Level 1 against a deployment. */
export function remoteSuite(origin?: string): void { gate('project:test:remote'); playwright([], remote(origin)); }
/** The smoke checks against a deployment (the deploys run it once the new version is live). */
export function live(origin?: string): void { playwright(['--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], remote(origin)); }
/** The other repositories this one serves, tested as they get it: the app's "test:consumers" script, when it has one. */
export function consumers(): void {
  gate('project:test:consumers');
  // Not silent: npm would hand loglevel=silent to every nested npm in the fixture (its publish dry run reads a 404 from npm's output).
  const result = spawnSync('npm', ['run', '--if-present', 'test:consumers'], { stdio: 'inherit', env: { ...process.env, REMY_FLOW: process.env.REMY_FLOW ?? 'hand' } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
/** Google's Core Web Vitals (level 2, speed) on a throwaway Cloudflare Worker of this commit, deleted whatever happens. */
export async function cwv(alias?: string): Promise<void> {
  gate('project:test:cwv');
  const origin = await preview(alias, true);
  const name = new URL(origin).hostname.split('.')[0]!;
  try { await withLevel2Lock(() => playwright(['--project=google-cwv', '--no-deps'], { TEST_BASE_URL: origin, TEST_TARGET: 'remote' })); console.log(`Core Web Vitals passed on ${origin}`); }
  finally { await previewDelete(name).catch(error => console.error(`test cwv: could not delete ${name}: ${error instanceof Error ? error.message : String(error)}`)); }
}

/** Open the last local or remote run's HTML report. */
export function report(which: 'local' | 'remote' = 'local'): void { spawnSync(join(process.cwd(), 'node_modules', '.bin', 'playwright'), ['show-report', `playwright-report/${which}`], { stdio: 'inherit' }); }

export async function main(args: string[]): Promise<void> {
  const [command, ...rest] = args;
  switch (command) {
    case undefined: return every();
    case 'quick': return quick();
    case 'only': { if (!rest.length) { console.error('remy test only <words>'); process.exit(2); } return only(rest.join(' ')); }
    case 'smoke': return smoke();
    case 'google': return google();
    case 'remote': return remoteSuite(rest[0]);
    case 'live': return live(rest[0]);
    case 'consumers': return consumers();
    case 'cwv': return cwv(rest[0]);
    case 'report': return report(rest[0] === 'remote' ? 'remote' : 'local');
    default: console.error('remy test: (every language) | quick | only <words> | smoke | google | cwv [alias] | remote [origin] | live [origin] | consumers | report [remote]'); process.exit(2);
  }
}
