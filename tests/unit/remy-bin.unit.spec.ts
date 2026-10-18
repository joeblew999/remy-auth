import { test, expect } from 'vite-plus/test';
import { spawnSync } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

// An app that installs the package runs the command line from node_modules, where Node strips no
// types (ERR_UNSUPPORTED_NODE_MODULES_TYPE_STRIPPING: GitHub's consumer job, 2026-10-11, on the first
// landing of the bin as .ts). So the bin is the JavaScript remy-cli's vp pack emits to packages/remy-cli/dist, and
// this check runs that JavaScript from under a node_modules folder, as an app would.

test('the emitted command line runs from under node_modules, where a .ts bin cannot', () => {
  const emitted = 'packages/remy-cli/dist/remy.mjs';
  expect(existsSync(emitted), `${emitted}: vp run @joeblew999/remy-cli#pack emits it`).toBe(true);
  const scratch = mkdtempSync(join(tmpdir(), 'remy-bin-'));
  try {
    // Both packages as pnpm publishes them: each manifest with its publishConfig's exports and bin in place (dist/,
    // not the source remy-auth runs), remy-cli's dist/, and remy-ui's dist/ and src/ (what the command line imports
    // by its exports: the build stamp, the paths).
    const cli = join(scratch, 'node_modules', '@joeblew999', 'remy-cli');
    const ui = join(scratch, 'node_modules', '@joeblew999', 'remy-ui');
    const installed = join(cli, 'dist');
    const published = (from: string, to: string) => {
      const manifest = JSON.parse(readFileSync(join(from, 'package.json'), 'utf8')) as Record<string, unknown> & {
        publishConfig?: Record<string, unknown>;
      };
      mkdirSync(to, { recursive: true });
      writeFileSync(join(to, 'package.json'), JSON.stringify({ ...manifest, ...manifest.publishConfig }));
      cpSync(join(from, 'dist'), join(to, 'dist'), { recursive: true });
    };
    published('packages/remy-cli', cli);
    published('packages/remy-ui', ui);
    cpSync('packages/remy-ui/src', join(ui, 'src'), { recursive: true });
    // And Vite Plus, which every app installs (the command line reads the app's .env with its loadEnv).
    symlinkSync(resolve('node_modules/vite-plus'), join(scratch, 'node_modules', 'vite-plus'));
    const result = spawnSync(process.execPath, [join(installed, 'remy.mjs')], { encoding: 'utf8', cwd: scratch });
    expect(result.stderr, result.stderr).not.toContain('TYPE_STRIPPING');
    expect(result.stderr).toContain('a command is needed');
    expect(result.status).toBe(2);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});
