// The browser checks (`remy test …`), each what a step, GitHub or a hand that said so runs; the gate
// (allowed.ts) refuses the heavy ones outside the flow. Level 1 is every check of ours; level 2 is
// Google's. `only <words>` is the one browser run a step does not own: the checks whose title matches,
// in the quick languages.
import { spawnSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { gate } from './allowed.ts';
import { preview, previewDelete } from './cloudflare.ts';
import { build } from './dev.ts';
import { allLanguages, skip } from './unchanged.ts';

function playwright(args: string[], env: Record<string, string>): void {
  const result = spawnSync(join(process.cwd(), 'node_modules', '.bin', 'playwright'), ['test', ...args], { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
const local = { TEST_TARGET: 'local' };
/** The quick languages: `quick`, which the checks resolve (checks.js: the base language and the first right-to-left one); QUICK_LOCALES names others. */
export const quickLocales = () => ({ CHECK_LOCALES: process.env.CHECK_LOCALES ?? process.env.QUICK_LOCALES ?? 'quick' });
const remote = (origin = process.env.TEST_BASE_URL ?? process.env.DEPLOY_ORIGIN) => {
  if (!origin) { console.error('test: pass TEST_BASE_URL, or put origins.production in remy.config.ts'); process.exit(1); }
  return { TEST_TARGET: 'remote', TEST_BASE_URL: origin };
};

/**
 * One speed measurement at a time on this machine (Google's level): a second run waits for the lock
 * rather than skewing the first. The lock is a directory; a file at its path (the mise-era flock, which
 * kept a release waiting 42 minutes on 2026-10-11) or a directory older than half an hour (a run that
 * died) is stale and taken over, and the wait says so every minute.
 */
async function withLevel2Lock<T>(work: () => T): Promise<T> {
  const lock = join(tmpdir(), 'remy-level2.lock');
  // Stale: a file (the mise-era flock), a directory older than half an hour, or one whose holder has gone
  // (its pid file names a process that no longer runs: a run stopped part-way, 2026-10-17).
  const holderGone = () => { try { const pid = Number(readFileSync(join(lock, 'pid'), 'utf8')); if (!pid) return false; process.kill(pid, 0); return false; } catch (error) { return (error as NodeJS.ErrnoException).code === 'ESRCH'; } };
  const stale = () => { try { const info = statSync(lock); return !info.isDirectory() || Date.now() - info.mtimeMs > 30 * 60_000 || holderGone(); } catch { return false; } };
  for (let waited = 0; ; waited++) {
    if (stale()) { console.log(`test: taking over a stale lock at ${lock}`); rmSync(lock, { recursive: true, force: true }); }
    try { mkdirSync(lock); writeFileSync(join(lock, 'pid'), String(process.pid)); break; } catch { if (waited % 30 === 0) console.log(`test: another speed measurement runs on this machine (${lock}); waiting for it.`); await new Promise(resolve => setTimeout(resolve, 2000)); }
  }
  try { return await work(); } finally { rmSync(lock, { recursive: true, force: true }); }
}

/** Every check of ours (level 1), on the production artifact in local Workers: in every language, or in English and Arabic when the change cannot differ by language. */
/** REMY_SHARD=<i>/<n> runs one part of the checks (GitHub splits level 1 across jobs; `npm run ci -- every --shard 1/3`). */
const shard = () => (process.env.REMY_SHARD ? [`--shard=${process.env.REMY_SHARD}`] : []);
export function every(): void {
  gate('project:test');
  if (skip('every')) return;
  // English and Arabic when nothing that changed can differ by language (unchanged.ts); CHECK_LOCALES set by hand wins.
  const languages = process.env.CHECK_LOCALES || allLanguages() ? {} : quickLocales();
  build();
  playwright(['--project=ours', ...shard()], { ...local, ...languages });
}
/** Every check in the quick languages. */
export function quick(): void { gate('project:test:quick'); build(); playwright(['--project=ours'], { ...local, ...quickLocales() }); }
/** The checks whose title matches, in the quick languages: the one browser run a step does not own. */
export function only(words: string): void { build(); playwright(['--project=ours', '--grep', words], { ...local, ...quickLocales() }); }
/** The smoke checks alone, on a local build. */
export function smoke(): void { build(); playwright(['--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], local); }
/** Google's audits (level 2), locally. */
export async function google(): Promise<void> { gate('project:test:google'); if (skip('google')) return; build(); await withLevel2Lock(() => playwright(['--project=google'], local)); }
/** Level 1 against a deployment. */
/**
 * The suite against a deployment. Against production (the default) everything, Google's audits included; against
 * any other origin (a preview, staging) our checks only: those are hidden from search engines on purpose, which
 * Google's crawlability audit rightly reports (a branch preview, 2026-10-17).
 */
export function remoteSuite(origin?: string): void {
  gate('project:test:remote');
  const production = !origin || origin === process.env.DEPLOY_ORIGIN;
  if (!production) console.log(`test remote: ${origin} is not production, so our checks only (Google's audits judge the production site).`);
  playwright(production ? [] : ['--project=ours'], remote(origin));
}
/** The smoke checks against a deployment (the deploys run it once the new version is live). */
export function live(origin?: string): void { playwright(['--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], remote(origin)); }
/** The other repositories this one serves, tested as they get it: the app's "test:consumers" script, when it has one. */
export function consumers(): void {
  gate('project:test:consumers');
  if (skip('consumers')) return;
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

export const what = 'the browser checks, over a local build or a deployment';
export const commands: Subcommands = {
  every: { what: 'every check in every language over a local build; the default (GitHub runs it after every landing)', run: () => every() },
  quick: { what: 'every check in a few languages (QUICK_LOCALES)', run: () => quick() },
  only: { what: '<words>: the checks whose title matches, in a few languages; the one targeted run by hand', run: rest => { if (!rest.length) { console.error('remy test only <words>'); process.exit(2); } return only(rest.join(' ')); } },
  smoke: { what: 'tier 1: every page answers, the home page hydrates', run: () => smoke() },
  google: { what: "Google's Lighthouse audits (level 2; one run at a time on this machine)", run: () => google() },
  cwv: { what: '[alias]: Core Web Vitals on a throwaway preview Worker', run: rest => cwv(rest[0]) },
  remote: { what: '[origin]: the browser checks against a deployment: production by default, Google\'s audits included; any other origin (a preview, staging) our checks only', run: rest => remoteSuite(rest[0]) },
  live: { what: '[origin]: the smoke against a deployment (every deploy ends with it)', run: rest => live(rest[0]) },
  consumers: { what: 'the repositories this one serves: the blank app and the consumer fixture', run: () => consumers() },
  report: { what: '[remote]: open the last HTML report, local or remote', run: rest => report(rest[0] === 'remote' ? 'remote' : 'local') },
};
export const main = dispatch('test', commands, 'every');
