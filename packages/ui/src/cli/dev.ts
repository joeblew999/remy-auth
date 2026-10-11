// The hand tools that run the app: `remy dev` (hot reload, port 5173), `remy build` (the production
// build and a Wrangler dry run), `remy preview` (the built Worker on Cloudflare's local host at the
// preview port). Each starts with the app's local state (its package.json "local" script, run if
// present: remy-auth writes .dev.vars and migrates its local D1 there), so nothing has to be remembered.
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';

function tool(command: string, args: string[], env: Record<string, string> = {}): void {
  const result = spawnSync(command, args, { stdio: 'inherit', env: { ...process.env, ...env } });
  if (result.status !== 0) { console.error(`${command} ${args.join(' ')}: failed`); process.exit(result.status ?? 1); }
}
const bin = (name: string) => join(process.cwd(), 'node_modules', '.bin', name);

/** The app's local state before it runs: its "local" script, when it has one. */
export const prepare = (): void => tool('npm', ['run', '--if-present', '--silent', 'local']);

export function dev(): void { prepare(); tool(bin('vite'), ['dev']); }

/** The production build, then Wrangler's deployment dry run; no upload. */
export function build(): void { prepare(); tool(bin('vite'), ['build']); tool(bin('wrangler'), ['deploy', '--dry-run']); }

/** Build, then serve the production artifact on Cloudflare's local host at PREVIEW_PORT. */
export function preview(): void { build(); tool(bin('wrangler'), ['dev', '--ip', '127.0.0.1', '--port', process.env.PREVIEW_PORT ?? '4173']); }

export function main(args: string[]): void {
  switch (args[0]) {
    case 'dev': return dev();
    case 'build': return build();
    case 'preview': return preview();
    default: console.error('remy app: dev | build | preview'); process.exit(2);
  }
}
