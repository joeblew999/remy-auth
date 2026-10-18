import { test, expect } from 'vite-plus/test';
import { readdirSync, readFileSync } from 'node:fs';

// What runs, in what order and when, is in plain sight: the package.json scripts and each package's vite.config.ts
// tasks, written out; the command line underneath is leaves, each doing what it is asked (owner, 2026-10-17: "in that
// configuration file of VP, you see everything. Everything else underneath it should be pretty dumb").

const cli = readdirSync('packages/remy-cli/src')
  .filter((file) => file.endsWith('.ts'))
  .map((name) => [name, readFileSync(`packages/remy-cli/src/${name}`, 'utf8')] as const);
const scriptsOf = (file: string) =>
  (JSON.parse(readFileSync(file, 'utf8')) as { scripts: Record<string, string> }).scripts;

test("remy-auth's flow is the blank app's, the command line run from its source", () => {
  const blank = scriptsOf('template/package.json');
  const ours = scriptsOf('package.json');
  const fromSource = (text: string) => text.replaceAll('node packages/remy-cli/src/remy.ts ', 'remy ');
  for (const name of ['prepare', 'translate', 'setup']) expect(fromSource(ours[name]!), name).toBe(blank[name]);
  // remy-auth adds its own: the new-app test to ci, the blank app's pins and shadcn's files to the release.
  expect(ours.ci).toBe(`${blank.ci} && vp run new-app`);
  expect(fromSource(ours.release!)).toBe(
    blank.release!.replace(
      '&& vp run publish:rehearse',
      '&& vp run template:check && vp run ui:verify && vp run publish:rehearse',
    ),
  );
  for (const name of readdirSync('template/.vite-hooks').filter((name) => name !== '_'))
    expect(readFileSync(`.vite-hooks/${name}`, 'utf8'), name).toBe(
      readFileSync(`template/.vite-hooks/${name}`, 'utf8'),
    );
});

test('the flow scripts run Vite Plus between the command line steps, never the other way round', () => {
  const blank = scriptsOf('template/package.json');
  // No script of ours touches git: committing, pushing and merging are git's and GitHub's own commands.
  expect(blank.land).toBeUndefined();
  expect(blank.release).toMatch(/^remy release check && CHECK_LOCALES=all vp run ci && /);
  expect(blank.setup).toMatch(/&& vp run ready$/);
  // Nothing of the command line runs Vite Plus's task runner, or npm run, whose scripts may.
  for (const [name, text] of cli)
    expect(text, name).not.toMatch(/['"]vp['"],\s*\[\s*['"]run['"]|['"]npm['"],\s*\[\s*['"]run['"]/);
});

test('no configuration makes tasks in code: each vite.config.ts writes its own out', () => {
  for (const file of [
    'vite.config.ts',
    'apps/remy-auth/vite.config.ts',
    'apps/remy-auth-docs/vite.config.ts',
    'packages/remy-ui/vite.config.ts',
    'packages/remy-cli/vite.config.ts',
    'template/vite.config.ts',
    'template/docs/vite.config.ts',
  ]) {
    const text = readFileSync(file, 'utf8');
    expect(text, file).toMatch(/run: \{\s*tasks: \{/);
    expect(text, file).not.toMatch(/remyTasks|remyWorkspace|tasks\.js/);
  }
});

test('the command line hands nothing on through the environment, and reads no switch of its own', () => {
  // A command passes a child what it needs in that child's own env (spawn's env), never by writing its own process's.
  for (const [name, text] of cli)
    expect(text, name).not.toMatch(
      /process\.env\.[A-Z_]+\s*(\?\?)?=(?!=)|process\.env\[[^\]]+\]\s*=(?!=)|Object\.assign\(process\.env/,
    );
  // The switches the old flow kept in the environment are gone, everywhere code reads them.
  const gone =
    /\b(REMY_FLOW|REMY_RECORD|REMY_SKIP_CI|REMY_REHEARSE_PUBLISH|QUICK_LOCALES|BEHAVIOUR_LOCALES|I18N_STRICT|I18N_INLANG|I18N_DOCS_DIR|I18N_MODEL|I18N_JOBS|PUBLIC_ORIGIN|REMY_WRANGLER_CONFIG)\b/;
  const code = [
    ...cli,
    ...['checks.js', 'playwright.js', 'app-vite.js'].map(
      (name) => [name, readFileSync(`packages/remy-ui/src/${name}`, 'utf8')] as const,
    ),
    ['run.sh', readFileSync('fixtures/consumer/run.sh', 'utf8')] as const,
    ['vite.config.ts', readFileSync('vite.config.ts', 'utf8')] as const,
  ];
  for (const [name, text] of code) expect(text.match(gone)?.[0], name).toBeUndefined();
});

test("the blank app's catalog has the workspace's versions, so a new app installs what remy-auth checked", () => {
  const entries = (file: string) =>
    Object.fromEntries(
      [...readFileSync(file, 'utf8').matchAll(/^ {2}['"]?([^'":]+)['"]?: ['"]([^'"]+)['"]$/gm)].map((match) => [
        match[1]!,
        match[2]!,
      ]),
    );
  const ours = entries('pnpm-workspace.yaml');
  const blank = entries('template/pnpm-workspace.yaml');
  for (const [name, version] of Object.entries(blank))
    if (!name.startsWith('@joeblew999/') && !name.startsWith('vite')) expect(version, name).toBe(ours[name]);
});
