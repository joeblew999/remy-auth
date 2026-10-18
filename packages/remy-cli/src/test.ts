// The browser checks Vite Plus has no tool for (`remy test remote|live|audits|cwv`): against a deployment, the audits
// under one machine-wide speed lock, Core Web Vitals on a throwaway Worker. The checks on the local build are Vite
// Plus's tasks (vp run test:browser), Playwright run directly. Each does what it is asked and nothing more.
import { spawnSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { preview, previewDelete } from './cloudflare.ts';
import { appDir, bin, origins } from './config.ts';

// Playwright from the app's folder, where its playwright.config.ts is (apps/remy-auth in remy-auth; an app's own root).
function playwright(args: string[], env: Record<string, string>): void {
  const results = join(
    appDir(),
    'playwright-report',
    `${env.TEST_TARGET === 'remote' ? 'remote' : 'local'}-results.json`,
  );
  rmSync(results, { force: true });
  const result = spawnSync(bin('playwright'), ['test', ...args], {
    stdio: 'inherit',
    cwd: appDir(),
    env: { ...process.env, ...env },
  });
  flaky(results);
  if (result.status !== 0) process.exit(result.status ?? 1);
}

type Suite = { specs?: { file: string; line: number; title: string; tests: { status: string }[] }[]; suites?: Suite[] };
/** The checks in Playwright's JSON results that passed only on their retry ("file:line title"). */
export function flakyIn(report: { suites?: Suite[] }): string[] {
  const found: string[] = [];
  const walk = (suite: Suite) => {
    for (const spec of suite.specs ?? [])
      if (spec.tests.some((test) => test.status === 'flaky')) found.push(`${spec.file}:${spec.line} ${spec.title}`);
    suite.suites?.forEach(walk);
  };
  report.suites?.forEach(walk);
  return found;
}

/** A check that passed only on its retry (playwright.js retries once under CI) is named in the run's summary line, never only in the log. */
function flaky(results: string): void {
  let report: { suites?: Suite[] };
  try {
    report = JSON.parse(readFileSync(results, 'utf8'));
  } catch {
    return;
  }
  const found = flakyIn(report);
  if (found.length) console.error(`test: ${found.length} flaky, passed only on its retry: ${found.join('; ')}`);
}
/** The quick languages for a deployment's checks (checks.js: the base language and the first right-to-left one), unless CHECK_LOCALES says. */
export const quickLocales = () => ({ CHECK_LOCALES: process.env.CHECK_LOCALES ?? 'quick' });
const remote = (origin = process.env.TEST_BASE_URL ?? origins().production) => {
  if (!origin) {
    console.error('test: pass TEST_BASE_URL, or put origins.production in remy.config.ts');
    process.exit(1);
  }
  return { TEST_TARGET: 'remote', TEST_BASE_URL: origin };
};

/**
 * One speed measurement at a time on this machine (Google's audits, Core Web Vitals): a second run waits for the lock
 * rather than skewing the first. The lock is a directory; a file at its path (the mise-era flock, which
 * kept a release waiting 42 minutes on 2026-10-11) or a directory older than half an hour (a run that
 * died) is stale and taken over, and the wait says so every minute.
 */
async function withSpeedLock<T>(work: () => T): Promise<T> {
  const lock = join(tmpdir(), 'remy-speed.lock');
  // Stale: a file (the mise-era flock), a directory older than half an hour, or one whose holder has gone
  // (its pid file names a process that no longer runs: a run stopped part-way, 2026-10-17).
  const holderGone = () => {
    try {
      const pid = Number(readFileSync(join(lock, 'pid'), 'utf8'));
      if (!pid) return false;
      process.kill(pid, 0);
      return false;
    } catch (error) {
      return (error as NodeJS.ErrnoException).code === 'ESRCH';
    }
  };
  const stale = () => {
    try {
      const info = statSync(lock);
      return !info.isDirectory() || Date.now() - info.mtimeMs > 30 * 60_000 || holderGone();
    } catch {
      return false;
    }
  };
  for (let waited = 0; ; waited++) {
    if (stale()) {
      console.log(`test: taking over a stale lock at ${lock}`);
      rmSync(lock, { recursive: true, force: true });
    }
    try {
      mkdirSync(lock);
      writeFileSync(join(lock, 'pid'), String(process.pid));
      break;
    } catch {
      if (waited % 30 === 0)
        console.log(`test: another speed measurement runs on this machine (${lock}); waiting for it.`);
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }
  }
  try {
    return await work();
  } finally {
    rmSync(lock, { recursive: true, force: true });
  }
}

/**
 * Our checks against a deployment (production by default); `--audits` adds Google's, which judge the production site:
 * a preview or staging is hidden from search engines on purpose, which Google's crawlability audit rightly reports.
 */
export function remoteSuite(args: string[]): void {
  const origin = args.find((arg) => !arg.startsWith('--'));
  playwright(args.includes('--audits') ? [] : ['--project=ours'], remote(origin));
}
/** The smoke checks against a deployment (the deploys run it once the new version is live). */
export function live(origin?: string): void {
  playwright(['--project=ours', '--grep', 'smoke [a-zA-Z-]+:'], remote(origin));
}
/** Google's Core Web Vitals (speed) on a throwaway Cloudflare Worker of this commit, deleted whatever happens. */
export async function cwv(alias?: string): Promise<void> {
  const origin = await preview(alias, true);
  const name = new URL(origin).hostname.split('.')[0]!;
  try {
    await withSpeedLock(() =>
      playwright(['--project=google-cwv', '--no-deps'], { TEST_BASE_URL: origin, TEST_TARGET: 'remote' }),
    );
    console.log(`Core Web Vitals passed on ${origin}`);
  } finally {
    await previewDelete(name).catch((error) =>
      console.error(`test cwv: could not delete ${name}: ${error instanceof Error ? error.message : String(error)}`),
    );
  }
}

/**
 * Google's audits on the local production build, under the machine's speed lock (the test:audits task runs it: a
 * lock is what Vite Plus has no tool for). Playwright's own options pass through.
 */
export const audits = (args: string[]): Promise<void> =>
  withSpeedLock(() => playwright(['--project=google', ...args], {}));

export const what =
  'the browser checks Vite Plus has no tool for: against a deployment (the suite, the smoke), Core Web Vitals on a preview, and the local audits under one lock (the local build: vp run test:browser)';
export const commands: Subcommands = {
  remote: {
    what: "[origin] [--audits]: our browser checks against a deployment (production by default); --audits adds Google's, which judge production",
    run: (rest) => remoteSuite(rest),
  },
  live: { what: '[origin]: the smoke against a deployment (every deploy ends with it)', run: (rest) => live(rest[0]) },
  audits: {
    what: "[playwright options]: Google's audits on the local build, one speed measurement at a time on this machine (vp run test:audits runs it)",
    run: (rest) => audits(rest),
  },
  cwv: {
    what: '[alias]: Core Web Vitals on a throwaway preview Worker (the release runs it)',
    run: (rest) => cwv(rest[0]),
  },
};
export const main = dispatch('test', commands);
