import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { compose, type BranchFact, type CommitFact, type RunFact } from './feedback.ts';

// Everything asynchronous, answered by whoever owns the fact and never stored: GitHub (its runs,
// pull requests), the Workers (what each runs), git (main, every worktree), the translation check.
// One screen, a couple of seconds. Every agent session starts with it (the SessionStart hook
// dev:guard registers); a developer runs it when they sit down. .plans/dev-feedback.md.
const read = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
const ask = (command: string, args: string[], timeout = 15_000) => { const r = spawnSync(command, args, { encoding: 'utf8', timeout }); return r.status === 0 ? r.stdout : undefined; };
const root = read('rev-parse', '--path-format=absolute', '--git-common-dir').replace(/\/\.git$/, '');
spawnSync('git', ['-C', root, 'fetch', '-q', 'origin', 'main'], { timeout: 15_000 });
const base = read('-C', root, 'rev-parse', '--verify', '-q', 'origin/main') ? 'origin/main' : 'main';

const commits: CommitFact[] = read('-C', root, 'log', '-5', '--format=%H\t%s\t%an\t%cr', base).split('\n').filter(Boolean).map(line => { const [sha, subject, author, when] = line.split('\t'); return { sha: sha!, subject: subject!, author: author!, when: when! }; });
const runs: RunFact[] = JSON.parse(ask('gh', ['run', 'list', '--branch', 'main', '--limit', '10', '--json', 'headSha,status,conclusion,url']) ?? '[]');
const branches: BranchFact[] = read('-C', root, 'worktree', 'list', '--porcelain').split('\n\n').filter(Boolean).map(block => {
  const path = /^worktree (.+)$/m.exec(block)?.[1] ?? '';
  const branch = (/^branch refs\/heads\/(.+)$/m.exec(block)?.[1]) ?? '(detached)';
  const counts = branch === '(detached)' ? '0\t0' : read('-C', root, 'rev-list', '--left-right', '--count', `${branch}...${base}`);
  const [ahead, behind] = counts.split(/\s+/).map(Number);
  return { branch, path, ahead: ahead ?? 0, behind: behind ?? 0, base };
});
const deployments = process.env.DEPLOY_ORIGIN ? ask('mise', ['run', '-q', 'cf:versions'], 20_000)?.split('\n').filter(line => /^(ORIGIN|https?:)/.test(line)).join('\n') : undefined;
const translations = (() => { const r = spawnSync('mise', ['run', '-q', 'i18n:check'], { encoding: 'utf8', timeout: 20_000, env: { ...process.env, I18N_STRICT: '1' } }); return r.status === 0 ? 'complete and current' : 'stale or missing (dev:land translates on main)'; })();
const pulls = JSON.parse(ask('gh', ['pr', 'list', '--json', 'number,title,author']) ?? '[]').map((pull: { number: number; title: string; author: { login: string } }) => ({ number: pull.number, title: pull.title, author: pull.author.login }));

// The open list, as the repo keeps it: the numbered items of now.md's "What is left" section, first line
// each; a struck item (~~closed~~) is not left.
const left = (() => {
  try {
    const now = readFileSync(`${root}/.plans/now.md`, 'utf8');
    const section = now.split(/^## /m).find(part => part.startsWith('What is left')) ?? '';
    return section.split('\n').filter(line => /^\d+\. (?!~~)/.test(line)).slice(0, 8).map(line => line.replace(/\*\*/g, '').replace(/\[([^\]]+)\]\([^)]*\)/g, '$1').slice(0, 110));
  } catch { return []; }
})();
console.log(compose({ commits, runs, branches, deployments, translations, pulls, left }).join('\n'));
