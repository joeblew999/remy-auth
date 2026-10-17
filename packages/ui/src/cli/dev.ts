// The hand tools that run the app: `remy dev` (hot reload, port 5173), `remy build` (the production
// build and a Wrangler dry run), `remy preview` (the built Worker on Cloudflare's local host at the
// preview port). Each starts with the app's local state (its package.json "local" script, run if
// present: remy-auth writes .dev.vars and migrates its local D1 there), so nothing has to be remembered.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { generate } from './check.ts';
import { dispatch, type Subcommands } from './commands.ts';

function tool(command: string, args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) {
    console.error(`${command} ${args.join(' ')}: failed`);
    process.exit(result.status ?? 1);
  }
}
const bin = (name: string) => join(process.cwd(), 'node_modules', '.bin', name);

/**
 * Before the app runs or builds: its local state (its "local" script, when it has one) and what it
 * generates (its "generate" script: the catalogs, the skill, the command line), once, in this process,
 * before any Vite build starts. Paraglide's Vite plugin compiles the catalogs again at build start; with
 * the inputs unchanged it rewrites nothing. On 2026-10-11 a staging build read the messages while that
 * compile was cleaning and rewriting them (28 of 611 modules on disk when the build died) and failed.
 */
export function prepare(): void {
  tool('npm', ['run', '--if-present', '--silent', 'local']);
  generate();
}

export function dev(): void {
  prepare();
  tool(bin('vp'), ['dev', '.']);
}

/** The production build, then Wrangler's deployment dry run; no upload. */
export function build(): void {
  prepare();
  tool(bin('vp'), ['build', '.']);
  tool(bin('wrangler'), ['deploy', '--dry-run']);
}

/** Build, then serve the production artifact on Cloudflare's local host at PREVIEW_PORT. */
export function preview(): void {
  build();
  tool(bin('wrangler'), ['dev', '--ip', '127.0.0.1', '--port', process.env.PREVIEW_PORT ?? '4173']);
}

export const what = 'the app itself: run it, build it, preview the build';
export const commands: Subcommands = {
  dev: { what: "Vite's dev server on local Workers with hot reload, port 5173 (npm run dev)", run: () => dev() },
  build: {
    what: "the production build, then Wrangler's deployment dry run; no upload (npm run build)",
    run: () => build(),
  },
  preview: {
    what: "build, then the production artifact on Cloudflare's local host at PREVIEW_PORT, 4173 by default; the browser checks run on the same (npm run preview)",
    run: () => preview(),
  },
};
export const main = dispatch('app', commands);
