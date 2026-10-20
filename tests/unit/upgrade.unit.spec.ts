import { test, expect } from 'vite-plus/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { agentSetup, platformAt, scriptsAndHooks } from '../../packages/remy-cli/src/upgrade.ts';

// remy upgrade sets the platform where an app from the blank app keeps it: its catalog, which the app and its docs
// both name as catalog: (issue #44: vp add pinned the app alone, and left its docs on the old remy-ui).

/** A scratch app from the blank app's three files, `change` applied, with `check` run inside it. */
function inApp(change: (app: string) => void, check: () => void): void {
  const app = mkdtempSync(join(tmpdir(), 'remy-upgrade-'));
  const here = process.cwd();
  try {
    for (const file of ['pnpm-workspace.yaml', 'package.json', 'docs/package.json'])
      cpSync(join('packages/create/templates/app', file), join(app, file));
    change(app);
    process.chdir(app);
    check();
  } finally {
    process.chdir(here);
    rmSync(app, { recursive: true, force: true });
  }
}

const catalogLine = (name: string) =>
  readFileSync('pnpm-workspace.yaml', 'utf8')
    .split('\n')
    .find((line) => line.includes(`@joeblew999/${name}`));

test("the upgrade moves the catalog, and names catalog: again where an earlier upgrade's vp add pinned it", () =>
  inApp(
    (app) => {
      const root = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
      root.dependencies['@joeblew999/remy-ui'] = '0.17.0';
      writeFileSync(join(app, 'package.json'), JSON.stringify(root, null, 2));
    },
    () => {
      expect(platformAt('9.8.7')).toBeTypeOf('function');
      expect(catalogLine('remy-ui')).toBe("  '@joeblew999/remy-ui': '9.8.7'");
      expect(catalogLine('remy-cli')).toBe("  '@joeblew999/remy-cli': '9.8.7'");
      for (const file of ['package.json', 'docs/package.json'])
        expect(JSON.parse(readFileSync(file, 'utf8')).dependencies['@joeblew999/remy-ui'], file).toBe('catalog:');
    },
  ));

test('a catalog written unquoted or with a comment moves too, its comment kept', () =>
  inApp(
    (app) => {
      const file = join(app, 'pnpm-workspace.yaml');
      writeFileSync(
        file,
        readFileSync(file, 'utf8')
          .replace(/^ {2}'@joeblew999\/remy-ui': '[^']*'$/m, '  "@joeblew999/remy-ui": 0.17.0 # the platform')
          .replace(/^ {2}'@joeblew999\/remy-cli': '[^']*'$/m, '  @joeblew999/remy-cli: 0.17.0'),
      );
    },
    () => {
      expect(platformAt('9.8.7')).toBeTypeOf('function');
      expect(catalogLine('remy-ui')).toBe(`  "@joeblew999/remy-ui": '9.8.7' # the platform`);
      expect(catalogLine('remy-cli')).toBe("  @joeblew999/remy-cli: '9.8.7'");
    },
  ));

test('putting the files back leaves them exactly as they were (for a failed install)', () =>
  inApp(
    () => {},
    () => {
      const before = ['pnpm-workspace.yaml', 'package.json', 'docs/package.json'].map((f) => readFileSync(f, 'utf8'));
      platformAt('9.8.7')?.();
      expect(['pnpm-workspace.yaml', 'package.json', 'docs/package.json'].map((f) => readFileSync(f, 'utf8'))).toEqual(
        before,
      );
    },
  ));

test('an app with no catalog entry for the platform is left to vp add', () =>
  inApp(
    (app) => {
      writeFileSync(join(app, 'pnpm-workspace.yaml'), "packages:\n  - .\ncatalog:\n  react: '19.3.1'\n");
      rmSync(join(app, 'docs'), { recursive: true });
    },
    () => expect(platformAt('9.8.7')).toBeUndefined(),
  ));

// The agent setup reaches apps through the upgrade: the session hook that sets up any machine with mise, mise.toml and
// the MCP servers. An app's own differing copy is kept as <file>.before-upgrade.
test("the upgrade gives an app the blank app's agent setup, keeping the app's own copy beside it", () => {
  const blank = resolve('packages/create/templates/app');
  inApp(
    (app) => writeFileSync(join(app, '.mcp.json'), '{"mcpServers":{}}\n'),
    () => {
      scriptsAndHooks(blank, '9.8.7');
      for (const file of agentSetup) expect(readFileSync(file, 'utf8')).toBe(readFileSync(join(blank, file), 'utf8'));
      expect(readFileSync('.mcp.json.before-upgrade', 'utf8')).toBe('{"mcpServers":{}}\n');
    },
  );
});
