import { defineConfig, devices } from '@playwright/test';

const remote = process.env.TEST_TARGET === 'remote';
if (remote && !process.env.TEST_BASE_URL) {
  throw new Error('Set TEST_BASE_URL to the deployed Worker origin for project:test:remote.');
}
const target = new URL(remote ? process.env.TEST_BASE_URL! : 'http://127.0.0.1:4173');
if (!['http:', 'https:'].includes(target.protocol) || target.username || target.password ||
    target.pathname !== '/' || target.search || target.hash) {
  throw new Error('TEST_BASE_URL must be an HTTP(S) origin without credentials, path, query or fragment.');
}

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  use: { baseURL: target.origin, ...devices['Desktop Chrome'], channel: 'chrome' },
  webServer: remote ? undefined : {
    command: './node_modules/.bin/vite preview',
    url: `${target.origin}/en`,
    reuseExistingServer: false,
    timeout: 90_000,
  },
});
