import { defineConfig, devices } from '@playwright/test';

// The docs Worker's few checks (tests/, beside this file in the package), run from an app's docs/ (the
// shared docs:test tasks pass -c): results and the local Worker there, the checks from here. locally against the built Worker on Cloudflare's local runtime
// (docs:test; Ask AI's AI Search binding is remote-only, so answers take their "no answer" path), remotely
// against a deployed origin (docs:test:remote). Fumadocs is tested by Fumadocs; these check what is ours.
const remote = process.env.TEST_TARGET === 'remote';
const origin = remote ? process.env.TEST_BASE_URL : `http://127.0.0.1:${process.env.PREVIEW_PORT ?? '4174'}`;

export default defineConfig({
  testDir: './tests',
  outputDir: `${process.cwd()}/test-results`,
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: origin, ...devices['Desktop Chrome'], channel: 'chrome' },
  projects: [
    { name: 'ours', testIgnore: /lighthouse\.spec\.js$/ },
    { name: 'google', testMatch: /lighthouse\.spec\.js$/ },
  ],
  webServer: remote ? undefined : {
    command: `../node_modules/.bin/wrangler dev -c dist/server/wrangler.json --local --ip 127.0.0.1 --port ${process.env.PREVIEW_PORT ?? '4174'}`,
    url: `${origin}/healthz`,
    cwd: process.cwd(),
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
