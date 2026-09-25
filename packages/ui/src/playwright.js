// Shared Playwright configuration for apps built on this package: TEST_TARGET "local" starts
// Cloudflare's local host on PREVIEW_PORT over the built artifact, "remote" tests TEST_BASE_URL,
// and HTML reports go to playwright-report/<target>. A project's playwright.config.ts is one call.
import { defineConfig, devices } from '@playwright/test';
import { baseLocale, localizeUrl } from './paraglide/runtime.js';

export function playwrightConfig({ webServer, testDir = './tests', timezoneId = 'Asia/Tokyo' } = {}) {
  const remote = process.env.TEST_TARGET === 'remote';
  if (remote && !process.env.TEST_BASE_URL) throw new Error('Set TEST_BASE_URL to the deployed origin for project:test:remote.');
  const port = process.env.PREVIEW_PORT ?? '4173';
  const target = new URL(remote ? process.env.TEST_BASE_URL : `http://127.0.0.1:${port}`);
  if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password || target.pathname !== '/' || target.search || target.hash) {
    throw new Error('TEST_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
  }
  return defineConfig({
    testDir,
    fullyParallel: true,
    reporter: [['list'], ['html', { open: 'never', outputFolder: `playwright-report/${remote ? 'remote' : 'local'}` }]],
    use: { baseURL: target.origin, ...devices['Desktop Chrome'], channel: 'chrome', timezoneId, colorScheme: process.env.COLOR_SCHEME ?? 'light' },
    // Two levels. "ours": the app's own checks, fast, gate every local release.
    // "google" and "google-cwv": Lighthouse audits and Core Web Vitals, slow, run in CI.
    // Core Web Vitals run after the Lighthouse audits so no other browser inflates the timings.
    projects: [
      { name: 'ours', testIgnore: /(lighthouse|performance)\.spec\.[jt]s$/ },
      { name: 'google', testMatch: /lighthouse\.spec\.[jt]s$/ },
      { name: 'google-cwv', testMatch: /performance\.spec\.[jt]s$/, dependencies: ['google'] },
    ],
    webServer: remote ? undefined : {
      command: webServer ?? `./node_modules/.bin/wrangler dev --ip 127.0.0.1 --port ${port}`,
      url: localizeUrl(new URL('/', target.origin), { locale: baseLocale }).href,
      reuseExistingServer: false,
      timeout: 90_000,
    },
  });
}
