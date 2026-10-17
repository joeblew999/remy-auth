import { test, expect } from '@playwright/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';

// The flow's gate (allowed.ts) refuses a heavy command that nobody said they were running. The pages
// never give one bare: in a fenced shell block, the suite, the release gate or the translator is
// written with REMY_FLOW=hand in front (a person's decision at a terminal) or not as a command at all.
// On 2026-10-10 eight lines on six pages did, and three installation tasks ended in the refusal.

const heavy = /^(?:[A-Z_]+=\S+\s+)*(?:npm\s+run\s+test\s+--\s+(?:every|quick|google|cwv|remote|consumers)\b|npm\s+test\b|npx\s+remy\s+verify(?!\s+(?:setup|tooling|doctor)\b)|npx\s+remy\s+i18n\s+translate\b)/;
const walk = (dir: string): string[] => readdirSync(dir).flatMap(name => { const path = `${dir}/${name}`; return statSync(path).isDirectory() ? walk(path) : [path]; });

test('no English page gives a heavy command bare in a shell block: REMY_FLOW=hand in front, or not as a command', () => {
  const translation = /\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.mdx?$/;
  const pages = [...walk('docs/content').filter(file => /\.mdx?$/.test(file) && !translation.test(file)), 'README.md', 'AGENTS.md'].filter(file => existsSync(file));
  expect(pages.length).toBeGreaterThan(5);
  const bare = pages.flatMap(file => {
    let fenced = false;
    return readFileSync(file, 'utf8').split('\n').flatMap((line, index) => {
      if (/^\s*(```|~~~)/.test(line)) { fenced = !fenced; return []; }
      return fenced && heavy.test(line.trim()) && !/^REMY_FLOW=hand\b/.test(line.trim()) ? [`${file}:${index + 1}: ${line.trim()}`] : [];
    });
  });
  expect(bare).toEqual([]);
});

// An installation (setup, the upgrades) ends with its own checks, about a minute and no browser; the
// browser suite is GitHub's after every landing and the release's (owner, 2026-10-11, of a setup that
// ran it: "Setup takes 2 minutes. This is clearly wrong").
test('an installation ends with the installation\'s checks, never the browser suite; the release gate starts with them', () => {
  const setup = readFileSync('packages/ui/src/cli/setup.ts', 'utf8');
  expect(setup.indexOf('await verifySetup();')).toBeGreaterThan(setup.indexOf('guard([]);'));
  expect(readFileSync('packages/ui/src/cli/verify.ts', 'utf8')).toMatch(/gate\('verify'\);\n\s*await verifySetup\(\);/);
  const packages = readFileSync('packages/ui/src/cli/packages.ts', 'utf8');
  expect(packages).toMatch(/export async function upgrade\(\)[\s\S]*?await verifySetup\(\);/);
  // The release marks itself before it runs the gate, or the gate refuses it.
  const release = packages.slice(packages.indexOf('export async function release()'));
  expect(release.indexOf("process.env.REMY_FLOW ??= 'release'")).toBeGreaterThan(0);
  expect(release.indexOf("process.env.REMY_FLOW ??= 'release'")).toBeLessThan(release.indexOf('await verify();'));
  expect(readFileSync('packages/ui/src/cli/upgrade.ts', 'utf8')).toMatch(/guard\(\[\]\);\n\s*await verifySetup\(\);/);
});
