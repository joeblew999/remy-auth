// The one place the tooling talks to GitHub about this repository: its name, pull requests, the checks on a
// commit, merging. Through `gh api` (GitHub's REST API, with the machine's gh sign-in), never gh's GraphQL
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

export type Pull = { number: number; html_url: string; title: string; head: { ref: string; sha: string }; user: { login: string } };

/** The open pull requests, newest first. */
export const pulls = (slug: string): Pull[] | undefined => api<Pull[]>(`repos/${slug}/pulls?state=open&per_page=50`);

/** The open pull request from `branch`, if there is one. */
export function pullFor(slug: string, branch: string): Pull | undefined {
  return api<Pull[]>(`repos/${slug}/pulls?state=open&head=${slug.split('/')[0]}:${encodeURIComponent(branch)}`)?.[0];
}

/** Opens a pull request from `branch` into main; fails the step when GitHub refuses. */
export function openPull(slug: string, branch: string, title: string, body: string): Pull {
  const result = spawnSync('gh', ['api', `repos/${slug}/pulls`, '-f', `title=${title}`, '-f', `head=${branch}`, '-f', 'base=main', '-f', `body=${body}`], { encoding: 'utf8' });
  if (result.status !== 0) throw new Error(`GitHub refused the pull request from ${branch}: ${result.stderr.trim() || result.stdout.trim()}`);
  return JSON.parse(result.stdout) as Pull;
}

type CheckRun = { name: string; status: string; conclusion: string | null; html_url: string };
type WorkflowRun = { status: string; conclusion: string | null; html_url: string };

/** What GitHub said about `sha` so far: every check (GitHub's own jobs and others', such as Cloudflare's build). */
export function checks(slug: string, sha: string): { done: boolean; failed: CheckRun[]; runs: number } | undefined {
  const runs = api<{ workflow_runs: WorkflowRun[] }>(`repos/${slug}/actions/runs?head_sha=${sha}&per_page=20`);
  const all = api<{ check_runs: CheckRun[] }>(`repos/${slug}/commits/${sha}/check-runs?per_page=100&filter=latest`);
  if (!runs || !all) return undefined;
  const failed = all.check_runs.filter(run => run.status === 'completed' && !['success', 'skipped', 'neutral'].includes(run.conclusion ?? ''));
  // Done once GitHub started the workflow for the commit and every check on it has finished.
  const done = runs.workflow_runs.length > 0 && runs.workflow_runs.every(run => run.status === 'completed') && all.check_runs.every(run => run.status === 'completed');
  return { done, failed, runs: runs.workflow_runs.length };
}

/** Waits for the checks on `sha`, saying so every minute: green, red (naming each failed job) or still running at the limit. */
export async function waitForChecks(slug: string, sha: string, minutes = 20): Promise<{ state: 'green' | 'red' | 'waiting'; failed: CheckRun[] }> {
  const started = Date.now();
  for (let polls = 0; Date.now() - started < minutes * 60_000; polls++) {
    const now = checks(slug, sha);
    if (now?.done) return now.failed.length ? { state: 'red', failed: now.failed } : { state: 'green', failed: [] };
    if (now?.failed.length) return { state: 'red', failed: now.failed };
    if (polls % 4 === 0) console.log(`dev:land: GitHub is checking ${sha.slice(0, 7)} (${Math.round((Date.now() - started) / 1000)} s so far)...`);
    await new Promise(resolve => setTimeout(resolve, 15_000));
  }
  return { state: 'waiting', failed: [] };
}

/** Squash-merges pull request `number` into main; the merge commit, or why GitHub refused (main moved and conflicts, checks required). */
export function merge(slug: string, number: number, title: string, message = ''): { sha: string } | { refused: string } {
  const result = spawnSync('gh', ['api', '-X', 'PUT', `repos/${slug}/pulls/${number}/merge`, '-f', 'merge_method=squash', '-f', `commit_title=${title}`, ...(message ? ['-f', `commit_message=${message}`] : [])], { encoding: 'utf8' });
  if (result.status !== 0) return { refused: result.stderr.trim() || result.stdout.trim() };
  return { sha: (JSON.parse(result.stdout) as { sha: string }).sha };
}

/** Deletes a branch on GitHub (a landed one); quiet when it is already gone. */
export function deleteBranch(slug: string, branch: string): void {
  spawnSync('gh', ['api', '-X', 'DELETE', `repos/${slug}/git/refs/heads/${branch}`], { stdio: 'ignore' });
}

/** Comments on a commit (GitHub tells its author); true when posted. */
export function commentOnCommit(slug: string, sha: string, body: string): boolean {
  try { execFileSync('gh', ['api', `repos/${slug}/commits/${sha}/comments`, '-f', `body=${body}`], { stdio: 'ignore' }); return true; } catch { return false; }
}
