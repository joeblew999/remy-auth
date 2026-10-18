// What the tooling reads about an app: where it is deployed, from the app's own .env (Vite's file, the one the app's
// build reads: VITE_DEPLOY_ORIGIN, VITE_DOCS_ORIGIN). Each command asks for the value it needs (origins()), read from the file
// when asked: nothing is copied into the environment for others to read (configure() did, for every command, so a
// value reached a child by a route no one could see; owner, 2026-10-17: "everything else underneath it should be
// pretty dumb").
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join, relative } from 'node:path';
import { loadEnv } from 'vite-plus';

/** Where the app and its docs are deployed: the app's .env as Vite reads it for a production build. */
export function origins(cwd = process.cwd()): { production?: string; docs?: string } {
  const env = loadEnv('production', appDir(cwd), 'VITE_');
  return { production: env.VITE_DEPLOY_ORIGIN || undefined, docs: env.VITE_DOCS_ORIGIN || undefined };
}

/**
 * The local ports: the tasks' own (4173 for the app's preview, 4174 for the docs'), unless the shell names others
 * (PREVIEW_PORT, DOCS_PREVIEW_PORT), as two checkouts running checks at once do.
 */
export const ports = (): { preview: number; docsPreview: number } => ({
  preview: Number(process.env.PREVIEW_PORT ?? 4173),
  docsPreview: Number(process.env.DOCS_PREVIEW_PORT ?? 4174),
});

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

/**
 * The docs' content folder relative to cwd: the translation tools read and name paths from the
 * repository's root. docsDir() is absolute, so never join it onto cwd (the docs check found nothing, 2026-10-17).
 */
export function docsContent(cwd = process.cwd()): string {
  return relative(cwd, join(docsDir(cwd) ?? join(cwd, 'docs'), 'content'));
}

/** The package each command the command line runs comes from: its own dependencies (packages/remy-cli/package.json). */
const owners: Record<string, string> = {
  wrangler: 'wrangler',
  playwright: '@playwright/test',
};

/**
 * A tool's command: the app's own (node_modules/.bin, from this folder up: what the app lists), else the command line's
 * own dependency's, by its package.json's bin, which pnpm links for the packages a package lists and no others.
 */
export function bin(name: string, cwd = process.cwd()): string {
  for (let dir = cwd; ; dir = dirname(dir)) {
    const file = join(dir, 'node_modules', '.bin', name);
    if (existsSync(file)) return file;
    if (dir === dirname(dir)) break;
  }
  const owner = owners[name];
  if (owner) {
    const manifest = createRequire(import.meta.url).resolve(`${owner}/package.json`);
    const { bin: bins } = JSON.parse(readFileSync(manifest, 'utf8')) as { bin?: string | Record<string, string> };
    const target = typeof bins === 'string' ? bins : bins?.[name];
    if (target) return join(dirname(manifest), target);
  }
  return join(cwd, 'node_modules', '.bin', name);
}
