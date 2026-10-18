// The browser checks against a deployment (`remy test remote|live|cwv`): the origin from the app's .env, the
// results' retried checks named. The checks on the local build are Vite Plus's tasks (vp run test:browser,
// vp run test:audits), Playwright run directly. Each does what it is asked and nothing more.
import { spawnSync } from 'node:child_process';
import { dispatch, type Subcommands } from './commands.ts';
import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
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
    console.error("test: pass an origin (or TEST_BASE_URL), or put VITE_DEPLOY_ORIGIN in the app's .env");
    process.exit(1);
  }
  return { TEST_TARGET: 'remote', TEST_BASE_URL: origin };
};

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
/**
 * Google's Core Web Vitals (speed) on a deployment: production by default, or a branch's Preview
 * (https://<branch>-remy-auth.<subdomain>.workers.dev), one page at a time.
 */
export function cwv(origin?: string): void {
  const target = remote(origin);
  playwright(['--project=google-cwv', '--no-deps', '--workers=1'], target);
  console.log(`Core Web Vitals passed on ${target.TEST_BASE_URL}`);
}

export const what =
  "the browser checks against a deployment (the suite, the smoke, Core Web Vitals); the local build's are Playwright run directly (vp run test:browser, vp run test:audits)";
export const commands: Subcommands = {
  remote: {
    what: "[origin] [--audits]: our browser checks against a deployment (production by default); --audits adds Google's, which judge production",
    run: (rest) => remoteSuite(rest),
  },
  live: { what: '[origin]: the smoke against a deployment (every deploy ends with it)', run: (rest) => live(rest[0]) },
  cwv: {
    what: "[origin]: Core Web Vitals on a deployment, production unless a Preview's origin is given",
    run: (rest) => cwv(rest[0]),
  },
};
export const main = dispatch('test', commands);
