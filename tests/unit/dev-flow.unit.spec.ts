import { test, expect } from 'vite-plus/test';
import { readdirSync, readFileSync } from 'node:fs';
import { flowScripts, hookFiles, taskNames } from '../../packages/ui/src/tasks.js';

// What runs, in what order and when, is in plain sight: the scripts and the Vite Plus tasks (tasks.js, one source for
// remy-auth, the blank app and every app remy upgrade moves); the command line underneath is leaves, each doing what
// it is asked (owner, 2026-10-17: "in that configuration file of VP, you see everything. Everything else underneath
// it should be pretty dumb").

const cli = readdirSync('packages/ui/src/cli')
  .filter((file) => file.endsWith('.ts'))
  .map((name) => [name, readFileSync(`packages/ui/src/cli/${name}`, 'utf8')] as const);

test('every repository has the same flow scripts and Git hooks, from tasks.js', () => {
  for (const [file, remy] of [
    ['package.json', 'node packages/ui/src/cli/remy.ts'],
    ['template/package.json', 'remy'],
  ] as const) {
    const { scripts } = JSON.parse(readFileSync(file, 'utf8')) as { scripts: Record<string, string> };
    expect(scripts, file).toMatchObject(flowScripts(remy));
    // A script and a task cannot share a name: Vite Plus runs the task.
    for (const name of taskNames()) expect(scripts[name], `${file}: ${name} is a task`).toBeUndefined();
  }
  expect(JSON.parse(readFileSync('template/package.json', 'utf8')).scripts).toEqual({
    ...flowScripts('remy'),
    upgrade: 'remy upgrade',
  });
  for (const folder of ['.vite-hooks', 'template/.vite-hooks'])
    for (const [name, text] of Object.entries(hookFiles))
      expect(readFileSync(`${folder}/${name}`, 'utf8'), `${folder}/${name}`).toBe(text);
});

test('the flow scripts run Vite Plus between the command line steps, never the other way round', () => {
  const scripts = flowScripts('remy');
  expect(scripts.land).toBe('remy land start && vp run translate && vp run ci && remy land finish');
  expect(scripts.release).toMatch(/^remy release check && CHECK_LOCALES=all vp run ci && vp run release-checks/);
  expect(scripts.setup).toMatch(/&& vp run check$/);
  // Nothing of the command line runs Vite Plus's task runner, or npm run, whose scripts may (the release's
  // npm run release-checks did, 2026-10-17).
  for (const [name, text] of cli)
    expect(text, name).not.toMatch(/['"]vp['"],\s*\[\s*['"]run['"]|['"]npm['"],\s*\[\s*['"]run['"]/);
});

test('the command line hands nothing on through the environment, and reads no switch of its own', () => {
  // A command passes a child what it needs in that child's own env (spawn's env), never by writing its own process's:
  // configure() did, for every command, so values reached children by a route nobody could see.
  for (const [name, text] of cli)
    expect(text, name).not.toMatch(
      /process\.env\.[A-Z_]+\s*(\?\?)?=(?!=)|process\.env\[[^\]]+\]\s*=(?!=)|Object\.assign\(process\.env/,
    );
  // The switches the old flow kept in the environment are gone, everywhere code reads them.
  const gone =
    /\b(REMY_FLOW|REMY_RECORD|REMY_SKIP_CI|REMY_REHEARSE_PUBLISH|QUICK_LOCALES|BEHAVIOUR_LOCALES|I18N_STRICT|I18N_INLANG|I18N_DOCS_DIR|I18N_MODEL|I18N_JOBS|PUBLIC_ORIGIN|REMY_WRANGLER_CONFIG)\b/;
  const code = [
    ...cli,
    ...['tasks.js', 'checks.js', 'playwright.js', 'app-vite.js'].map(
      (name) => [name, readFileSync(`packages/ui/src/${name}`, 'utf8')] as const,
    ),
    ['run.sh', readFileSync('fixtures/consumer/run.sh', 'utf8')] as const,
    ['vite.config.ts', readFileSync('vite.config.ts', 'utf8')] as const,
  ];
  for (const [name, text] of code) expect(text.match(gone)?.[0], name).toBeUndefined();
});
