// What an app tells its tooling, once: remy.config.ts at its root (defineRemyProject), where it is
// deployed and its local ports. The steps read it here and hand it on as the environment the tasks
// still expect (DEPLOY_ORIGIN, STAGING_ORIGIN, DOCS_ORIGIN, the VITE_ copies, the ports), set only
// where the shell did not. A worktree's ports come from its name, so nothing is written for them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { basename, join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type RemyProject = {
  /** Where the app is deployed: production, its staging, its docs Worker. */
  origins?: { production?: string; staging?: string; docs?: string };
  /** The main checkout's local ports (a worktree computes its own); never 4190, which browsers block. */
  ports?: { preview?: number; docsPreview?: number };
  /** For a repository that publishes packages: the one whose version names a release, and the release's title. */
  release?: { package: string; title?: string };
};

export const defineRemyProject = (project: RemyProject): RemyProject => project;

/** The app's remy.config.ts, or nothing. */
export async function project(cwd = process.cwd()): Promise<RemyProject> {
  const file = join(cwd, 'remy.config.ts');
  if (!existsSync(file)) return {};
  const loaded = await import(pathToFileURL(file).href) as { default?: RemyProject };
  return loaded.default ?? {};
}

/** This worktree's own ports, from its name: the same name, the same ports, never shared with another. */
export function portsFor(name: string): { preview: number; docsPreview: number } {
  const seed = parseInt(createHash('sha256').update(name).digest('hex').slice(0, 6), 16);
  const preview = 4200 + (seed % 400) * 2;
  return { preview, docsPreview: preview + 1 };
}

/** The worktree's name when the cwd is one; the main checkout has none. */
export function worktreeName(cwd = process.cwd()): string | undefined {
  try {
    const read = (...args: string[]) => execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
    const top = read('rev-parse', '--show-toplevel');
    return top === root ? undefined : basename(top);
  } catch { return undefined; }
}

/**
 * How to run remy in a checkout, for a hook or a child: the platform's own source where it is
 * (remy-auth), else the installed bin (an app; the package's emitted JavaScript, since Node strips
 * types from nothing under node_modules).
 */
export function remyCommand(cwd = process.cwd()): string[] {
  const source = join(cwd, 'packages', 'ui', 'src', 'cli', 'remy.ts');
  return existsSync(source) ? [process.execPath, source] : [join(cwd, 'node_modules', '.bin', 'remy')];
}

/** The environment the steps and the tasks read, from the config, set where the shell did not. */
export async function configure(cwd = process.cwd()): Promise<RemyProject> {
  const config = await project(cwd);
  const set = (name: string, value: string | number | undefined) => { if (value !== undefined && process.env[name] === undefined) process.env[name] = String(value); };
  set('DEPLOY_ORIGIN', config.origins?.production); set('VITE_DEPLOY_ORIGIN', config.origins?.production);
  set('STAGING_ORIGIN', config.origins?.staging); set('VITE_STAGING_ORIGIN', config.origins?.staging);
  set('DOCS_ORIGIN', config.origins?.docs); set('VITE_DOCS_ORIGIN', config.origins?.docs);
  set('RELEASE_PACKAGE', config.release?.package); set('RELEASE_TITLE', config.release?.title);
  const name = worktreeName(cwd);
  const ports = name ? portsFor(name) : { preview: config.ports?.preview ?? 4173, docsPreview: config.ports?.docsPreview ?? 4174 };
  set('PREVIEW_PORT', ports.preview); set('DOCS_PREVIEW_PORT', ports.docsPreview);
  return config;
}
