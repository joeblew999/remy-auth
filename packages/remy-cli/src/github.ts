// The one place the tooling talks to GitHub about this repository, reading only (its name, its pull requests) and
// commenting on a commit: opening and merging pull requests is git's and gh's, run by whoever does the work. Through `gh api` (GitHub's REST API, with the machine's gh sign-in), never gh's GraphQL
// commands (gh pr create, gh repo view): GraphQL is refused from Claude's cloud sessions, and the same command
// must work on a Mac, in a cloud agent's container and anywhere else (owner, 2026-10-17).
import { execFileSync, spawnSync } from 'node:child_process';

/** owner/name of the repository `origin` points at, read from the remote's URL (no network). */
export function repo(cwd = '.'): string | undefined {
  const url = spawnSync('git', ['-C', cwd, 'remote', 'get-url', 'origin'], { encoding: 'utf8' }).stdout?.trim() ?? '';
  return /github\.com[/:]([^/]+\/[^/]+?)(?:\.git)?$/.exec(url)?.[1];
}

/** A REST call (`gh api`); undefined when gh cannot answer (not installed, not signed in, offline, refused). */
export function api<T>(path: string, args: string[] = []): T | undefined {
  const result = spawnSync('gh', ['api', path, ...args], { encoding: 'utf8', timeout: 30_000 });
  if (result.status !== 0) return undefined;
  return (result.stdout.trim() ? JSON.parse(result.stdout) : {}) as T;
}

export type Pull = {
  number: number;
  html_url: string;
  title: string;
  head: { ref: string; sha: string };
  user: { login: string };
};

/** The open pull requests, newest first. */
export const pulls = (slug: string): Pull[] | undefined => api<Pull[]>(`repos/${slug}/pulls?state=open&per_page=50`);

/** Comments on a commit (GitHub tells its author); true when posted. */
export function commentOnCommit(slug: string, sha: string, body: string): boolean {
  try {
    execFileSync('gh', ['api', `repos/${slug}/commits/${sha}/comments`, '-f', `body=${body}`], { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
