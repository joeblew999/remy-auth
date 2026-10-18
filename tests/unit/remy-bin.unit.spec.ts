import { test, expect } from 'vite-plus/test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdtempSync, rmSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// An app that installs the package runs the command line from node_modules, where Node strips no
// types (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: GitHub's consumer job, 2026-10-11, on the first
// landing of the bin as .ts). So the bin is the JavaScript remy-cli's build emits to packages/remy-cli/dist, and
// this check runs that JavaScript from under a node_modules folder, as an app would.

test('the emitted command line runs from under node_modules, where a .ts bin cannot', () => {
  const emitted = 'packages/remy-cli/dist/remy.js';
  expect(existsSync(emitted), `${emitted}: vp run @joeblew999/remy-cli#build emits it`).toBe(true);
  const scratch = mkdtempSync(join(tmpdir(), 'remy-bin-'));
  try {
    // Both packages as npm installs them: remy-cli's manifest and dist/, and remy-ui's manifest and src/ (what the
    // command line imports by its exports: the build stamp, the paths).
    const cli = join(scratch, 'node_modules', '@joeblew999', 'remy-cli');
    const ui = join(scratch, 'node_modules', '@joeblew999', 'remy-ui');
    const installed = join(cli, 'dist');
    cpSync('packages/remy-cli/dist', installed, { recursive: true });
    cpSync('packages/remy-cli/package.json', join(cli, 'package.json'));
    cpSync('packages/remy-ui/package.json', join(ui, 'package.json'));
    cpSync('packages/remy-ui/src', join(ui, 'src'), { recursive: true });
    // And Vite Plus, which every app installs (the command line reads the app's .env with its loadEnv).
    symlinkSync(resolve('node_modules/vite-plus'), join(scratch, 'node_modules', 'vite-plus'));
    const result = spawnSync(process.execPath, [join(installed, 'remy.js')], { encoding: 'utf8', cwd: scratch });
    expect(result.stderr, result.stderr).not.toContain('TYPE_STRIPPING');
    expect(result.stderr).toContain('a command is needed');
    expect(result.status).toBe(2);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
