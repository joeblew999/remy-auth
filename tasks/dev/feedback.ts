// What dev:status and dev:land say, composed from facts they are given, so a check can hand them facts
// (tests/unit). No imports: the app's checks load this too.

export type CommitFact = { sha: string; subject: string; author: string; when: string };
export type RunFact = { headSha: string; status: string; conclusion: string | null; url: string };
export type BranchFact = { branch: string; path: string; ahead: number; behind: number; base: string };
export type Facts = {
  commits: CommitFact[];
  runs: RunFact[];
  branches: BranchFact[];
  deployments?: string;
  translations?: string;
  pulls?: { number: number; title: string; author: string }[];
  /** The top of .plans/now.md's "What is left, in order": what the next landing takes. */
  left?: string[];
};

const verdict = (run: RunFact | undefined) => !run ? 'no run' : run.status !== 'completed' ? `running ${run.url}` : run.conclusion === 'success' ? 'green' : `RED ${run.url}`;

/** The screen, as lines. */
export function compose({ commits, runs, branches, deployments, translations, pulls, left }: Facts): string[] {
  const byCommit = new Map(runs.map(run => [run.headSha.slice(0, 7), run]));
  const runOf = (commit: CommitFact) => byCommit.get(commit.sha.slice(0, 7));
  const red = commits.filter(commit => runOf(commit)?.status === 'completed' && runOf(commit)?.conclusion !== 'success');
  const lines: string[] = [];
  lines.push('main, newest first, with what GitHub said:');
  for (const commit of commits) lines.push(`  ${commit.sha.slice(0, 7)}  ${verdict(byCommit.get(commit.sha.slice(0, 7))).padEnd(7)}  ${commit.subject.slice(0, 70)}  (${commit.author}, ${commit.when})`);
  if (red.length) lines.push(`  main is red at ${red.map(commit => commit.sha.slice(0, 7)).join(', ')}: fix that before landing more on it.`);
  if (deployments) lines.push('', 'deployments (asked, never remembered):', ...deployments.split('\n').filter(Boolean).map(line => `  ${line}`));
  const working = branches.filter(branch => branch.branch !== 'main');
  lines.push('', working.length ? 'work in progress (worktrees):' : 'work in progress: none (every branch is landed).');
  for (const branch of working) {
    const behindRed = red.length > 0 && branch.behind > 0;
    lines.push(`  ${branch.branch.padEnd(24)} ${branch.ahead} ahead, ${branch.behind} behind main${behindRed ? ' (behind a red commit: dev:land merges main in; check what it says)' : ''}  ${branch.path}`);
  }
  if (translations) lines.push('', `translations: ${translations}`);
  if (pulls?.length) lines.push('', 'pull requests:', ...pulls.map(pull => `  #${pull.number} ${pull.title} (${pull.author})`));
  if (left?.length) lines.push('', 'what is left, in order (.plans/now.md; seen something? fix it or add it there, in the same landing):', ...left.map(item => `  ${item}`));
  return lines;
}

/** A part of a step and how long it took. */
export type Part = { what: string; ms: number };

/** A length of time as a person reads it: "6 s", "5 min 14 s". */
export const span = (ms: number) => { const seconds = Math.round(ms / 1000); return seconds < 60 ? `${seconds} s` : `${Math.floor(seconds / 60)} min ${seconds % 60} s`; };

/** What a step says about its time: the whole, then each part ("5 min 57 s: the check 6 s, staging 33 s, translation 5 min 14 s"). */
export const took = (parts: Part[]) => `${span(parts.reduce((sum, part) => sum + part.ms, 0))}: ${parts.map(part => `${part.what} ${span(part.ms)}`).join(', ')}`;
