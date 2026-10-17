import { pulls as githubPulls, repo } from './github.ts';
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compose, type BranchFact, type CommitFact, type RunFact } from './feedback.ts';
import { translationGaps } from './i18n.ts';
import { versions } from './cloudflare.ts';
import { origins } from './config.ts';

// `remy status` (vp run status): what is going on, one screen, a report that changes nothing but git's copy of main.

export async function main(): Promise<void> {
  // Everything asynchronous, answered by whoever owns the fact and never stored: GitHub (its runs,
  // pull requests), the Workers (what each runs), git (main, every worktree), the translation check.
  // One screen, a couple of seconds. Every agent session starts with it (the SessionStart hook
  // `remy hooks` registers); a developer runs it when they sit down. .plans/dev-feedback.md.
  const read = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  const ask = (command: string, args: string[], timeout = 15_000) => {
    const r = spawnSync(command, args, { encoding: 'utf8', timeout });
    return r.status === 0 ? r.stdout : undefined;
  };
  const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
  // Main as GitHub has it, named in full (a clone's fetch rule may leave origin/main behind otherwise).
  spawnSync('git', ['-C', root, 'fetch', '-q', 'origin', '+refs/heads/main:refs/remotes/origin/main'], {
    timeout: 15_000,
  });
  const base = read('-C', root, 'rev-parse', '--verify', '-q', 'origin/main') ? 'origin/main' : 'main';

  const commits: CommitFact[] = read('-C', root, 'log', '-5', '--format=%H\t%s\t%an\t%cr', base)
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [sha, subject, author, when] = line.split('\t');
      return { sha: sha!, subject: subject!, author: author!, when: when! };
    });
  const runs: RunFact[] = JSON.parse(
    ask('gh', [
      'run',
      'list',
      '--branch',
      'main',
      '--event',
      'push',
      '--limit',
      '10',
      '--json',
      'headSha,status,conclusion,url',
    ]) ?? '[]',
  );
  const branches: BranchFact[] = read('-C', root, 'worktree', 'list', '--porcelain')
    .split('\n\n')
    .filter(Boolean)
    .map((block) => {
      const path = /^worktree (.+)$/m.exec(block)?.[1] ?? '';
      const branch = /^branch refs\/heads\/(.+)$/m.exec(block)?.[1] ?? '(detached)';
      const counts =
        branch === '(detached)'
          ? '0\t0'
          : read('-C', root, 'rev-list', '--left-right', '--count', `${branch}...${base}`);
      const [ahead, behind] = counts.split(/\s+/).map(Number);
      return { branch, path, ahead: ahead ?? 0, behind: behind ?? 0, base };
    });
  const deployments = origins().production
    ? (await versions()).table
        .split('\n')
        .filter((line) => /^(ORIGIN|https?:)/.test(line))
        .join('\n')
    : undefined;
  const translations =
    (await translationGaps(root)).length === 0
      ? 'complete and current'
      : 'stale or missing (vp run land translates them in the change)';
  const slug = repo(root);
  const pulls = (slug ? (githubPulls(slug) ?? []) : []).map((pull) => ({
    number: pull.number,
    title: pull.title,
    author: pull.user.login,
  }));

  // The open list, as the repo keeps it: the numbered items of now.md's "What is left" section, first line
  // each; a struck item (~~closed~~) is not left.
  const left = (() => {
    try {
      const now = readFileSync(`${root}/.plans/now.md`, 'utf8');
      const section = now.split(/^## /m).find((part) => part.startsWith('What is left')) ?? '';
      return section
        .split('\n')
        .filter((line) => /^\d+\. (?!~~)/.test(line))
        .slice(0, 8)
        .map((line) =>
          line
            .replace(/\*\*/g, '')
            .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
            .slice(0, 110),
        );
    } catch {
      return [];
    }
  })();
  console.log(compose({ commits, runs, branches, deployments, translations, pulls, left }).join('\n'));
}

export const what =
  "what is going on: main with GitHub's verdicts, the open pull requests, the deployments, the worktrees, the translations, the top of now.md";

/** A GitHub run of the checks workflow, as `gh run list` reports it. */
export type Run = { status: string; conclusion: string | null; url: string; headSha: string };

/**
 * GitHub's run for `commit` (or the newest on main): what the checks said. `undefined` when gh cannot answer (not
 * installed, not signed in, offline), `null` when GitHub has no run for it. Main's push runs only: Dependabot's run on
 * a commit says nothing about the checks, and a release tag's run on the same commit is the release job's.
 */
export function latestRun(commit?: string): Run | null | undefined {
  const select = commit ? ['--commit', commit, '--branch', 'main'] : ['--branch', 'main'];
  const result = spawnSync(
    'gh',
    ['run', 'list', ...select, '--event', 'push', '--limit', '1', '--json', 'status,conclusion,url,headSha'],
    { encoding: 'utf8', timeout: 15_000 },
  );
  if (result.status !== 0) return undefined;
  const [run] = JSON.parse(result.stdout || '[]') as Run[];
  return run ?? null;
}

/** One line a person reads: what GitHub said about a commit. */
export const describeRun = (run: Run) =>
  `${run.status === 'completed' ? (run.conclusion ?? 'unknown') : 'still running'} on ${run.headSha.slice(0, 7)}: ${run.url}`;

/** Where the work is: the branch, whether it is main, whether the tree is clean. */
export function where(): { branch: string; onMain: boolean; clean: boolean } {
  const git = (...args: string[]) =>
    execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();
  const branch = git('branch', '--show-current');
  return { branch, onMain: branch === 'main', clean: git('status', '--porcelain') === '' };
}
