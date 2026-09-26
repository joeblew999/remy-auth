import { defineConfig, devices } from '@playwright/test';

// The docs Worker's few checks (tests/): locally against the built Worker on Cloudflare's local runtime
// (docs:test; Ask AI's AI Search binding is remote-only, so answers take their "no answer" path), remotely
// against a deployed origin (docs:test:remote). Fumadocs is tested by Fumadocs; these check what is ours.
const remote = process.env.TEST_TARGET === 'remote';
const origin = remote ? process.env.TEST_BASE_URL! : `http://127.0.0.1:${process.env.PREVIEW_PORT ?? '4174'}`;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  reporter: [['list']],
  use: { baseURL: origin, ...devices['Desktop Chrome'], channel: 'chrome' },
  projects: [
    { name: 'ours', testIgnore: /lighthouse\.spec\.ts$/ },
    { name: 'google', testMatch: /lighthouse\.spec\.ts$/ },
  ],
  webServer: remote ? undefined : {
    command: `../node_modules/.bin/wrangler dev --local --ip 127.0.0.1 --port ${process.env.PREVIEW_PORT ?? '4174'}`,
    url: `${origin}/healthz`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
