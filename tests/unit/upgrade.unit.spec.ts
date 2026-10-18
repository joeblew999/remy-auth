import { test, expect } from 'vite-plus/test';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { platformAt } from '../../packages/remy-cli/src/upgrade.ts';

// remy upgrade sets the platform where an app from the blank app keeps it: its catalog, which the app and its docs
// both name as catalog: (issue #44: vp add pinned the app alone, and left its docs on the old remy-ui).
test("the upgrade moves the catalog, and names catalog: again where an earlier upgrade's vp add pinned it", () => {
  const app = mkdtempSync(join(tmpdir(), 'remy-upgrade-'));
  const here = process.cwd();
  try {
    for (const file of ['pnpm-workspace.yaml', 'package.json', 'docs/package.json'])
      cpSync(join('packages/create/templates/app', file), join(app, file));
    const root = JSON.parse(readFileSync(join(app, 'package.json'), 'utf8'));
    root.dependencies['@joeblew999/remy-ui'] = '0.17.0';
    writeFileSync(join(app, 'package.json'), JSON.stringify(root, null, 2));
    process.chdir(app);
    expect(platformAt('9.8.7')).toBe(true);
    const workspace = readFileSync('pnpm-workspace.yaml', 'utf8');
    expect(workspace).toContain("'@joeblew999/remy-ui': '9.8.7'");
    expect(workspace).toContain("'@joeblew999/remy-cli': '9.8.7'");
    for (const file of ['package.json', 'docs/package.json']) {
      const deps = JSON.parse(readFileSync(file, 'utf8')).dependencies;
      expect(deps['@joeblew999/remy-ui'], file).toBe('catalog:');
    }
  } finally {
    process.chdir(here);
    rmSync(app, { recursive: true, force: true });
  }
});

test('an app with no catalog entry for the platform is left to vp add', () => {
  const app = mkdtempSync(join(tmpdir(), 'remy-upgrade-'));
  const here = process.cwd();
  try {
    writeFileSync(join(app, 'pnpm-workspace.yaml'), "packages:\n  - .\ncatalog:\n  react: '19.3.1'\n");
    process.chdir(app);
    expect(platformAt('9.8.7')).toBe(false);
  } finally {
    process.chdir(here);
    rmSync(app, { recursive: true, force: true });
  }
});
