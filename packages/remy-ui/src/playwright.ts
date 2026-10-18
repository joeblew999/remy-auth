// Shared Playwright configuration for apps built on this package (the browser checks; the plain-function ones
// are Vite Plus's test runner, vp test): TEST_TARGET "local" starts Cloudflare's local host on PREVIEW_PORT over
// the built artifact, "remote" tests TEST_BASE_URL, and HTML reports go to playwright-report/<target>. A project's
// playwright.config.ts is one call.
import { defineConfig, devices } from '@playwright/test';
import type { PlaywrightTestConfig } from '@playwright/test';
import { baseLocale, localizeUrl } from '@joeblew999/remy-ui/runtime';

export function playwrightConfig({
  webServer,
  testDir = './tests',
  timezoneId = 'Asia/Tokyo',
}: { webServer?: string; testDir?: string; timezoneId?: string } = {}): PlaywrightTestConfig {
  const remote = process.env.TEST_TARGET === 'remote';
  if (remote && !process.env.TEST_BASE_URL)
    throw new Error('Set TEST_BASE_URL to the deployed origin for npx remy test remote.');
  const port = process.env.PREVIEW_PORT ?? '4173';
  const target = new URL(remote ? (process.env.TEST_BASE_URL as string) : `http://127.0.0.1:${port}`);
  if (
    !['http:', 'https:'].includes(target.protocol) ||
    target.username ||
    target.password ||
    target.pathname !== '/' ||
    target.search ||
    target.hash
  ) {
    throw new Error('TEST_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  return defineConfig({
    testDir,
    fullyParallel: true,
    // PLAYWRIGHT_WORKERS caps the browsers this run starts, for machines running several agents at once. In
    // CI the runner is ours alone, so one browser per core rather than Playwright's half (GitHub's runner for
    // a public repository has four cores; the "every language" job used two of them, 2026-10-17).
    ...(process.env.PLAYWRIGHT_WORKERS
      ? { workers: Number(process.env.PLAYWRIGHT_WORKERS) }
      : process.env.CI
        ? { workers: '100%' }
        : {}),
    // One retry under CI (vp run ci sets CI locally too, so the same here as on GitHub): the local Workers
    // server can drop a reused connection mid-request ("socket hang up", PR #22, 2026-10-17), which says
    // nothing about the app. A check that passes only on its retry is reported as flaky, never hidden.
    retries: process.env.CI ? 1 : 0,
    // The browser is Playwright's own Chromium, pinned by the @playwright/test version and installed by
    // `vp run ci`, not whatever Chrome a machine has: the same browser on a Mac, in a cloud agent's
    // container and on GitHub, so a check gives the same answer everywhere (owner, 2026-10-17). Its light
    // headless shell, for speed, for every check.
    // The results as JSON too (results.json beside the report), so the command line can name a flaky check in its summary.
    reporter: [
      ['list'],
      ['html', { open: 'never', outputFolder: `playwright-report/${remote ? 'remote' : 'local'}` }],
      ['json', { outputFile: `playwright-report/${remote ? 'remote' : 'local'}-results.json` }],
    ],
    use: {
      baseURL: target.origin,
      ...devices['Desktop Chrome'],
      timezoneId,
      colorScheme: (process.env.COLOR_SCHEME ?? 'light') as 'light' | 'dark' | 'no-preference',
    },
    // Two levels. "ours": the app's own checks, fast, gate every local release.
    // "google" and "google-cwv": Lighthouse audits and Core Web Vitals, slow, run in CI.
    // Core Web Vitals run after the Lighthouse audits so no other browser inflates the timings.
    // The plain-function checks (*.unit.spec.ts) are vp test's, never Playwright's.
    projects: [
      { name: 'ours', testIgnore: /(lighthouse|performance|\.unit)\.spec\.[jt]s$/ },
      { name: 'google', testMatch: /lighthouse\.spec\.[jt]s$/ },
      { name: 'google-cwv', testMatch: /performance\.spec\.[jt]s$/, dependencies: ['google'] },
    ],
    webServer: remote
      ? undefined
      : {
          command: webServer ?? `wrangler dev --ip 127.0.0.1 --port ${port}`,
          url: localizeUrl(new URL('/', target.origin), { locale: baseLocale }).href,
          reuseExistingServer: false,
          timeout: 90_000,
        },
  });
}
