import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { readFileSync, rmSync } from 'node:fs';

// Google Lighthouse via the pinned Chrome DevTools CLI, against the same target as the GUI checks.
// The CLI runs the accessibility, SEO, best-practices and agentic-browsing categories; upstream
// excludes Performance by design and offers performance_start_trace instead (see the GUI plan).
// Every scored audit in every returned category must pass, not only the category score, because
// some WCAG audits carry zero weight. No audit or category is exempt. The CLI shares one daemon, so these audits run serially.
// Fix failures at their source: shadcn-generated tokens and components in packages/ui
// change through shadcn, not by hand-editing them or overriding them in the app.
const cli = (...args: string[]) => execFileSync('./node_modules/.bin/chrome-devtools', args,
  { encoding: 'utf8', env: { ...process.env, NODE_NO_WARNINGS: '1' }, timeout: 120_000 });

const pages = [
  { path: '/en', device: 'mobile' },
  { path: '/en', device: 'desktop' },
  { path: '/es', device: 'mobile' },
  { path: '/ar', device: 'mobile' },
  { path: '/en/demo', device: 'mobile' },
  { path: '/en/formats', device: 'mobile' },
];

test.describe.configure({ mode: 'serial', timeout: 120_000 });
test.beforeAll(() => { cli('start', '--isolated', '--headless', '--no-usage-statistics', '--no-performance-crux'); });
test.afterAll(() => { cli('stop'); });

for (const { path, device } of pages) {
  test(`lighthouse ${device}: ${path} passes every audit`, async ({ baseURL }, testInfo) => {
    const dir = testInfo.outputPath('lighthouse');
    rmSync(dir, { recursive: true, force: true });
    cli('navigate_page', '1', '--url', `${baseURL}${path}`);
    cli('lighthouse_audit', '1', '--device', device, '--output-format', 'json', '--outputDirPath', dir);
    const report = JSON.parse(readFileSync(`${dir}/report.json`, 'utf8'));
    expect(report.finalDisplayedUrl).toBe(`${baseURL}${path}`);
    const failures = Object.values(report.categories).flatMap((category: any) => category.auditRefs)
      .map((ref: any) => report.audits[ref.id])
      .filter((audit: any) => audit.score !== null && audit.score < 1)
      .map((audit: any) => `${audit.id}: ${audit.title}`);
    await testInfo.attach('lighthouse.html', { path: `${dir}/report.html`, contentType: 'text/html' });
    expect([...new Set(failures)], 'See the lighthouse.html attachment in the HTML report').toEqual([]);
  });
}
