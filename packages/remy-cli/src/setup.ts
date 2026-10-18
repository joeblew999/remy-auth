// `remy setup check` and `remy setup install`: an installation's first two steps. The setup script names all of them,
// in order (each a leaf of its own):
//
//   remy setup check && remy setup install && remy skills install && remy rules && remy mcp register &&
//   remy verify && vp run ready
//
// About two minutes, no browser: the browser checks are vp run ci's.
import { join } from 'node:path';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { dispatch, type Subcommands } from './commands.ts';
import { appDir } from './config.ts';

/** What setup needs before it can start, each with where to go. */
export function preconditions(): void {
  const recipe =
    'docs/content/dev/projects.md, "A new consumer" (https://remy-auth-docs.gedw99.workers.dev/dev/projects#a-new-consumer)';
  const problems: string[] = [];
  if (spawnSync('git', ['rev-parse', '--git-dir'], { stdio: 'ignore' }).status !== 0)
    problems.push('not a git repository: run git init (the translation and plans tools read git history)');
  if (!existsSync('package.json')) problems.push(`no package.json: start from the blank app (${recipe})`);
  else if (!existsSync('pnpm-lock.yaml'))
    problems.push('no pnpm-lock.yaml: run vp install once and commit it (setup installs exactly what it says)');
  if (!existsSync(join(appDir(), 'wrangler.jsonc')))
    problems.push(`no wrangler.jsonc: the Worker's name and bindings; the blank app has one (${recipe})`);
  if (problems.length) {
    console.error(`setup cannot start here:\n${problems.map((problem) => `  - ${problem}`).join('\n')}`);
    process.exit(1);
  }
}

/** GitHub Packages' token (the shared UI): the shell's, else gh's login. */
export function githubToken(): string | undefined {
  if (process.env.GITHUB_TOKEN) return process.env.GITHUB_TOKEN;
  try {
    return (
      execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim() ||
      undefined
    );
  } catch {
    return undefined;
  }
}

/**
 * GitHub Packages' token in this machine's own pnpm configuration: pnpm reads no token from a repository's .npmrc
 * (environment variables are not expanded in repository-controlled registry credentials), so the app's .npmrc only
 * says where @joeblew999 packages come from.
 */
export function githubPackagesLogin(token = githubToken()): void {
  if (!token) return;
  spawnSync('pnpm', ['config', 'set', '--location', 'user', '//npm.pkg.github.com/:_authToken', token], {
    stdio: 'ignore',
  });
}

/** The dependencies as the lockfile says (vp install, with pnpm; its install runs vp config: Vite Plus's Git hooks), with GitHub Packages' token. */
export function install(): void {
  const token = githubToken();
  githubPackagesLogin(token);
  const result = spawnSync('vp', ['install', '--frozen-lockfile'], {
    stdio: 'inherit',
    env: { ...process.env, ...(token ? { GITHUB_TOKEN: token } : {}) },
  });
  if (result.status !== 0) {
    console.error('setup: vp install failed');
    process.exit(result.status ?? 1);
  }
}

export const what = "an installation's first steps: what it needs, then the dependencies (vp run setup runs the rest)";
export const commands: Subcommands = {
  check: {
    what: 'what setup needs before it can start: git, package.json and its lockfile, wrangler.jsonc',
    run: () => preconditions(),
  },
  install: {
    what: "vp install --frozen-lockfile with GitHub Packages' token (its install runs vp config: Vite Plus's Git hooks)",
    run: () => install(),
  },
};
export const main = dispatch('setup', commands);
