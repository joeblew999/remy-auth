// Which of GitHub's check levels a pull request's changes can affect (owner, 2026-10-17: a pull request
// that changed one Markdown file still ran three five-minute jobs). The rule lives here, as code with
// its own unit checks, not in the workflow: the workflow runs `npm run test -- <level>` as before, and a
// level nothing touched says so and passes, so every job still reports and no pull request waits on one
// that never started. Pushes to main and tags run everything; only pull requests are filtered.
import { spawnSync } from 'node:child_process';

export type Level = 'every' | 'google' | 'consumers';

/**
 * Changes no level tests: plans, the docs Worker's content and Markdown outside the packages. The docs
 * pages that the unit checks read are still checked, by `npm run check -- unit`, which always runs.
 */
export function inert(file: string): boolean {
  if (file.startsWith('.plans/') || file.startsWith('docs/')) return true;
  return /\.mdx?$/.test(file) && !file.startsWith('packages/');
}

/** What only the consumer fixture exercises: the blank app and the fixture's own files. */
const consumerOnly = (file: string) => file.startsWith('template/') || file.startsWith('fixtures/');

/**
 * What the consumer fixture depends on: the packages it packs, the blank app, its own files, and what
 * decides how anything installs or runs.
 */
const consumerInputs = (file: string) =>
  file.startsWith('packages/') || consumerOnly(file) || file.startsWith('.github/workflows/')
  || ['package.json', 'package-lock.json', '.node-version'].includes(file);

/**
 * Whether `level` must run for these changed files. Unknown paths count for every and google, so a new
 * folder is tested until someone decides otherwise; consumers runs only for its inputs.
 */
export function affects(level: Level, files: readonly string[]): boolean {
  const live = files.filter(file => !inert(file));
  if (level === 'consumers') return live.some(consumerInputs);
  return live.some(file => !consumerOnly(file));
}

/**
 * The files this pull request changes, or undefined when they cannot be known (then everything runs).
 * In GitHub's pull_request runs the checkout is the merge commit, whose first parent is the base
 * branch's tip (the workflow checks out two commits deep for it). REMY_CHANGES_BASE=<ref> asks the same
 * question anywhere, against that ref: what the run would skip, before pushing.
 */
export function changedFiles(): string[] | undefined {
  const base = process.env.REMY_CHANGES_BASE;
  const pullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request';
  if (!base && !pullRequest) return undefined;
  const range = base ? [`${base}...HEAD`] : ['HEAD^1', 'HEAD'];
  const result = spawnSync('git', ['diff', '--name-only', ...range], { encoding: 'utf8' });
  if (result.status !== 0) { console.log(`test: could not tell what changed (git diff ${range.join(' ')}): running everything.`); return undefined; }
  return result.stdout.split('\n').map(line => line.trim()).filter(Boolean);
}

/** True when `level` can be skipped: it says so, naming what changed, so a skipped job is never silent. */
export function skip(level: Level): boolean {
  const files = changedFiles();
  if (!files || affects(level, files)) return false;
  const shown = files.slice(0, 8).join(', ') + (files.length > 8 ? `, and ${files.length - 8} more` : '');
  console.log(`test ${level}: skipped, nothing it checks changed (${files.length ? shown : 'no files'}).`);
  return true;
}
