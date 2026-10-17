import { test, expect } from 'vite-plus/test';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { flowScripts, hookFiles, taskNames } from '../../packages/ui/src/tasks.js';

// The flow's gate (allowed.ts) refuses what costs money or ships when nobody said they were running it. The pages
// never give one bare: in a fenced shell block, the translator or Core Web Vitals is written with REMY_FLOW=hand in
// front (a person's decision at a terminal) or not as a command at all. On 2026-10-10 eight lines on six pages gave
// a gated command bare, and three installation tasks ended in the refusal.

const heavy = /^(?:[A-Z_]+=\S+\s+)*(?:npx\s+remy\s+i18n\s+translate\b|npx\s+remy\s+test\s+cwv\b)/;
const walk = (dir: string): string[] =>
  readdirSync(dir).flatMap((name) => {
    const path = `${dir}/${name}`;
    return statSync(path).isDirectory() ? walk(path) : [path];
  });

test('no English page gives a heavy command bare in a shell block: REMY_FLOW=hand in front, or not as a command', () => {
  const translation = /\.[a-z]{2,3}(?:-[A-Za-z]{2,4})?\.mdx?$/;
  const pages = [
    ...walk('apps/docs/content').filter((file) => /\.mdx?$/.test(file) && !translation.test(file)),
    'README.md',
    'AGENTS.md',
  ].filter((file) => existsSync(file));
  expect(pages.length).toBeGreaterThan(5);
  const bare = pages.flatMap((file) => {
    let fenced = false;
    return readFileSync(file, 'utf8')
      .split('\n')
      .flatMap((line, index) => {
        if (/^\s*(```|~~~)/.test(line)) {
          fenced = !fenced;
          return [];
        }
        return fenced && heavy.test(line.trim()) && !/^REMY_FLOW=hand\b/.test(line.trim())
          ? [`${file}:${index + 1}: ${line.trim()}`]
          : [];
      });
  });
  expect(bare).toEqual([]);
});

// The flow's steps are scripts that run Vite Plus between their own parts, never the other way round: land and a
// release prepare (what changes the files, or what would stop them), then vp run ci, then their own part; setup
// installs, then vp run check. The installation's own checks run no check and no browser (owner, 2026-10-11, of a
// setup that ran the browser suite: "Setup takes 2 minutes. This is clearly wrong").
test('the flow runs vp run ci or vp run check between its own parts, in remy-auth and in every app', () => {
  for (const [file, remy] of [
    ['package.json', 'node packages/ui/src/cli/remy.ts'],
    ['template/package.json', 'remy'],
  ] as const) {
    const { scripts } = JSON.parse(readFileSync(file, 'utf8')) as { scripts: Record<string, string> };
    expect(scripts.land, file).toBe(`${remy} flow prepare land && vp run ci && ${remy} flow land`);
    expect(scripts.release, file).toBe(
      `${remy} flow prepare release && REMY_REHEARSE_PUBLISH=1 vp run ci && ${remy} flow release`,
    );
    expect(scripts.setup, file).toBe(`${remy} setup && vp run check`);
    // What remy upgrade writes into an app is what remy-auth and the template have: one source, tasks.js.
    expect(scripts, file).toMatchObject(flowScripts(remy));
    for (const name of taskNames()) expect(scripts[name], `${file}: ${name} is a task`).toBeUndefined();
  }
  expect(JSON.parse(readFileSync('template/package.json', 'utf8')).scripts).toEqual({
    ...flowScripts('remy'),
    upgrade: 'remy upgrade',
  });
  for (const folder of ['.vite-hooks', 'template/.vite-hooks'])
    for (const [name, text] of Object.entries(hookFiles))
      expect(readFileSync(`${folder}/${name}`, 'utf8'), `${folder}/${name}`).toBe(text);
  const verify = readFileSync('packages/ui/src/cli/verify.ts', 'utf8');
  const setupChecks = verify.slice(verify.indexOf('export async function verifySetup()'));
  expect(setupChecks.slice(0, setupChecks.indexOf('\n}'))).not.toMatch(/check\(\)|every\(\)|consumers\(\)/);
  // Nothing of the command line's runs Vite Plus's task runner: the scripts do.
  for (const name of readdirSync('packages/ui/src/cli').filter((file) => file.endsWith('.ts')))
    expect(readFileSync(`packages/ui/src/cli/${name}`, 'utf8'), name).not.toMatch(/['"]vp['"],\s*\[\s*['"]run['"]/);
});
