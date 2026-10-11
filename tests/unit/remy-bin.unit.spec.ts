import { test, expect } from '@playwright/test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

// An app that installs the package runs the command line from node_modules, where Node strips no
// types (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: GitHub's consumer job, 2026-10-11, on the first
// landing of the bin as .ts). So the bin is the JavaScript ui:generate emits to packages/ui/cli, and
// this check runs that JavaScript from under a node_modules folder, as an app would.

test('the emitted command line runs from under node_modules, where a .ts bin cannot', () => {
  const emitted = 'packages/ui/cli/remy.js';
  expect(existsSync(emitted), `${emitted}: ui:generate emits it (tsc -p packages/ui/src/cli)`).toBe(true);
  const scratch = mkdtempSync(join(tmpdir(), 'remy-bin-'));
  try {
    const installed = join(scratch, 'node_modules', '@joeblew999', 'remy-ui', 'cli');
    cpSync('packages/ui/cli', installed, { recursive: true });
    const result = spawnSync(process.execPath, [join(installed, 'remy.js')], { encoding: 'utf8', cwd: scratch });
    expect(result.stderr, result.stderr).not.toContain('TYPE_STRIPPING');
    expect(result.stderr).toContain('a command is needed');
    expect(result.status).toBe(2);
  } finally { rmSync(scratch, { recursive: true, force: true }); }
});
