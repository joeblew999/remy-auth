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

test('a new app runs on the Node remy-auth runs on', () => {
  expect(readFileSync('template/.node-version', 'utf8')).toBe(readFileSync('.node-version', 'utf8'));
  const engines = (file: string) => (JSON.parse(readFileSync(file, 'utf8')) as { engines?: unknown }).engines;
  expect(engines('template/package.json')).toEqual(engines('package.json'));
});

test("remy-auth's flow is the blank app's, the command line run from its source", () => {
  const blank = scriptsOf('template/package.json');
  const ours = scriptsOf('package.json');
  const fromSource = (text: string) => text.replaceAll('node packages/remy-cli/src/remy.ts ', 'remy ');
  for (const name of ['prepare', 'translate']) expect(fromSource(ours[name]!), name).toBe(blank[name]);
  // An app's setup first puts GitHub Packages' token where pnpm reads it; remy-auth installs nothing from there.
  expect(blank.setup!.endsWith(` && ${fromSource(ours.setup!)}`), 'setup').toBe(true);
  // remy-auth adds its own release (an app publishes no packages), which runs the new-app test after ci.
  expect(ours.ci).toBe(blank.ci);
  expect(ours.release).toContain('vp run ci && vp run new-app && ');
  expect(blank.release).toBeUndefined();
  expect(ours.release).toMatch(/^changeset version && /);
  for (const name of readdirSync('template/.vite-hooks').filter((name) => name !== '_'))
    expect(readFileSync(`.vite-hooks/${name}`, 'utf8'), name).toBe(
      readFileSync(`template/.vite-hooks/${name}`, 'utf8'),
    );
});

test('the flow scripts run Vite Plus between the command line steps, never the other way round', () => {
  const blank = scriptsOf('template/package.json');
  // No script of ours touches git: committing, pushing and merging are git's and GitHub's own commands.
  expect(blank.land).toBeUndefined();
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
    ...['checks.ts', 'playwright.ts', 'app-vite.ts'].map(
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
  const shared = Object.entries(blank).filter(([name]) => !name.startsWith('@joeblew999/') && !name.startsWith('vite'));
  expect(Object.fromEntries(shared)).toEqual(Object.fromEntries(shared.map(([name]) => [name, ours[name]])));
});

test('every catalog: dependency in the blank app has its catalog entry', () => {
  const catalog = new Set(
    [...readFileSync('template/pnpm-workspace.yaml', 'utf8').matchAll(/^ {2}['"]?([^'":]+)['"]?: /gm)].map(
      (match) => match[1]!,
    ),
  );
  const missing = ['template/package.json', 'template/docs/package.json'].flatMap((file) => {
    const manifest = JSON.parse(readFileSync(file, 'utf8')) as Record<string, Record<string, string> | undefined>;
    return ['dependencies', 'devDependencies'].flatMap((section) =>
      Object.entries(manifest[section] ?? {})
        .filter(([name, spec]) => spec === 'catalog:' && !catalog.has(name))
        .map(([name]) => `${file}: ${name}`),
    );
  });
  expect(missing).toEqual([]);
});

test("the new-app test's app is the blank app's, with only its named extras", () => {
  const json = (file: string) => JSON.parse(readFileSync(file, 'utf8')) as Record<string, any>;
  const blank = json('template/package.json');
  const fixture = json('fixtures/consumer/files/package.json');
  expect(fixture.dependencies).toEqual({
    ...blank.dependencies,
    '@joeblew999/remy-fixture-contract': 'workspace:*',
    '@joeblew999/remy-showcase': 'catalog:',
    '@orpc/server': 'catalog:',
  });
  expect({ ...fixture, dependencies: undefined }).toEqual({ ...blank, dependencies: undefined });
  const docs = json('fixtures/consumer/files/docs/package.json');
  expect(docs).toEqual({
    ...json('template/docs/package.json'),
    dependencies: {
      ...json('template/docs/package.json').dependencies,
      '@joeblew999/remy-fixture-contract': 'workspace:*',
    },
  });
  expect(readFileSync('fixtures/consumer/files/docs/docs.config.ts', 'utf8')).toBe(
    readFileSync('template/docs/docs.config.ts', 'utf8').replace(
      "  branch: 'main',\n",
      "  branch: 'main',\n  contract: '@joeblew999/remy-fixture-contract',\n",
    ),
  );
  expect(json('fixtures/consumer/files/src/parts.json')).toEqual([
    ...(json('template/src/parts.json') as unknown as string[]),
    '@joeblew999/remy-showcase/time-zones',
  ]);
  const entries = (file: string) =>
    Object.fromEntries(
      [
        ...readFileSync(file, 'utf8')
          .split('\noverrides:')[0]!
          .matchAll(/^ {2}['"]?([^'":]+)['"]?: ['"]([^'"]+)['"]$/gm),
      ].map((match) => [match[1]!, match[2]!]),
    );
  const fixtureCatalog = entries('fixtures/consumer/files/pnpm-workspace.yaml');
  const blankCatalog = Object.entries(entries('template/pnpm-workspace.yaml')).filter(
    ([name]) => !name.startsWith('@joeblew999/'),
  );
  expect(Object.fromEntries(blankCatalog.map(([name]) => [name, fixtureCatalog[name]]))).toEqual(
    Object.fromEntries(blankCatalog),
  );
});
