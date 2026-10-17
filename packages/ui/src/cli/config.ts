// What an app tells its tooling, once: remy.config.ts at its root (defineRemyProject), where it is
// deployed and its local ports. The steps read it here and hand it on as the environment the tasks
// still expect (DEPLOY_ORIGIN, STAGING_ORIGIN, DOCS_ORIGIN, the VITE_ copies, the ports), set only
// where the shell did not. A worktree's ports come from its name, so nothing is written for them.
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, readdirSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
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
  const loaded = (await import(pathToFileURL(file).href)) as { default?: RemyProject };
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
    const read = (...args: string[]) =>
      execFileSync('git', ['-C', cwd, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
    const top = read('rev-parse', '--show-toplevel');
    return top === root ? undefined : basename(top);
  } catch {
    return undefined;
  }
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
  // The origins and the release are remy.config.ts's alone: set from it, or removed, so a value left in the
  // shell by another project steers nothing here (on 2026-10-11 a shell still carrying remy-auth's
  // mise-era [env] made remy-auth-app's landing deploy a staging Worker and wait on remy-auth's).
  const own = (name: string, value: string | undefined) => {
    if (value === undefined) delete process.env[name];
    else process.env[name] = value;
  };
  own('DEPLOY_ORIGIN', config.origins?.production);
  own('VITE_DEPLOY_ORIGIN', config.origins?.production);
  own('STAGING_ORIGIN', config.origins?.staging);
  own('VITE_STAGING_ORIGIN', config.origins?.staging);
  own('DOCS_ORIGIN', config.origins?.docs);
  own('VITE_DOCS_ORIGIN', config.origins?.docs);
  own('RELEASE_PACKAGE', config.release?.package);
  own('RELEASE_TITLE', config.release?.title);
  // The ports: a worktree's own, else the config's; a port given in the shell wins (two checkouts on one machine).
  const set = (name: string, value: number) => {
    if (process.env[name] === undefined) process.env[name] = String(value);
  };
  const name = worktreeName(cwd);
  const ports = name
    ? portsFor(name)
    : { preview: config.ports?.preview ?? 4173, docsPreview: config.ports?.docsPreview ?? 4174 };
  set('PREVIEW_PORT', ports.preview);
  set('DOCS_PREVIEW_PORT', ports.docsPreview);
  return config;
}

/**
 * Where a repository's app and docs are, from its folders (never set): an app that is its own repository is the
 * folder itself (its wrangler.jsonc) and its docs are docs/; a workspace (remy-auth) has them as packages under apps/,
 * the docs the one with a docs.config.ts. Absolute paths.
 */
function packageDirs(cwd: string): string[] {
  const parent = join(cwd, 'apps');
  return existsSync(parent) ? readdirSync(parent).map((name) => join(parent, name)) : [];
}
export function appDir(cwd = process.cwd()): string {
  if (existsSync(join(cwd, 'wrangler.jsonc'))) return cwd;
  return packageDirs(cwd).find((dir) => existsSync(join(dir, 'wrangler.jsonc'))) ?? cwd;
}
export function docsDir(cwd = process.cwd()): string | undefined {
  if (existsSync(join(cwd, 'docs', 'docs.config.ts'))) return join(cwd, 'docs');
  return packageDirs(cwd).find((dir) => existsSync(join(dir, 'docs.config.ts')));
}

/** An installed tool's binary: node_modules/.bin, from this folder up, as Node resolves packages (a workspace installs once, at its root). */
export function bin(name: string, cwd = process.cwd()): string {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const file = join(dir, 'node_modules', '.bin', name);
    if (existsSync(file) || dir === dirname(dir)) return file;
  }
}
