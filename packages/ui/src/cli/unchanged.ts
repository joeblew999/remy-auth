// Everything the tooling knows about earlier runs and what changed since, in one module (owner,
// 2026-10-17: "make sure we don't have bits of code scattered all over the place"). Any step that skips
// work because nothing changed, or keeps a record of a run, goes through here and nowhere else:
//
// - `languageInput` / `allLanguages`: whether level 1 runs in every language or in English and Arabic.
// - `cacheDir`: the one folder for such state, node_modules/.cache/remy. Never checked in (node_modules
//   is ignored), one per checkout and worktree (each has its own install), thrown away with a CI runner,
//   wiped by a fresh `npm ci`.
// - `whenChanged`: run a step only when the files it reads changed since it last passed (a fingerprint
//   of their paths, sizes and times, stamped when the step passes). dev:change's steps use it.
// - `changedFiles` / `affects` / `skip`: which of `npm run ci`'s parts a branch's changes can affect,
//   from git (against the base branch on a pull request, against origin/main locally).
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

/** The one folder for state about earlier runs (created on first use). */
export function cacheDir(): string {
  const dir = join(process.cwd(), 'node_modules', '.cache', 'remy');
  mkdirSync(dir, { recursive: true });
  return dir;
}

// --- A step that runs only when its files changed since it last passed ---------------------------------

/** A fingerprint (path, size, modification time) of every file the globs name, node_modules excluded. */
function fingerprint(patterns: string[]): string {
  const hash = createHash('sha256');
  const toRegExp = (glob: string) => new RegExp(`^${glob.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*\*\//g, '(?:.*/)?').replace(/\*/g, '[^/]*')}$`);
  const walk = (dir: string): string[] => existsSync(dir) ? readdirSync(dir, { withFileTypes: true }).flatMap(entry => { const path = join(dir, entry.name); return entry.isDirectory() ? (entry.name === 'node_modules' ? [] : walk(path)) : [path]; }) : [];
  for (const pattern of patterns) {
    const fixed = pattern.split('/').filter(part => !part.includes('*'));
    const base = pattern.includes('*') ? fixed.slice(0, pattern.split('/').findIndex(part => part.includes('*'))).join('/') || '.' : pattern;
    const matches = toRegExp(pattern);
    const files = pattern.includes('*') ? walk(base).map(file => relative(process.cwd(), file).split(sep).join('/')).filter(file => matches.test(file)) : (existsSync(pattern) ? [pattern] : []);
    for (const file of files.sort()) { const info = statSync(file); hash.update(`${file} ${info.size} ${info.mtimeMs}\n`); }
  }
  return hash.digest('hex');
}

/** Runs `step` unless the files `patterns` name are as they were when it last passed; stamps it when it passes. */
export function whenChanged(name: string, patterns: string[], step: () => void): void {
  const file = join(cacheDir(), `${name}.stamp`);
  if (existsSync(file) && readFileSync(file, 'utf8') === fingerprint(patterns)) { console.log(`${name}: nothing changed since it last passed.`); return; }
  step();
  // The files as they are after the pass: a step that writes among them (wrangler types) does not undo its own stamp.
  writeFileSync(file, fingerprint(patterns));
}

// --- Which of npm run ci's parts a branch's changes can affect -----------------------------------------
// (owner, 2026-10-17: a pull request that changed one Markdown file still ran three five-minute jobs).
// The workflow runs `npm run ci -- <part>` as always; a part nothing it checks touched says so and
// passes, so every job still reports. Pushes to main and tags run everything; ci decides when to compare.

export type Part = 'every' | 'google' | 'consumers';

/**
 * Changes no part tests: plans, the docs Worker's content and Markdown outside the packages. The docs
 * pages the unit checks read are still checked, by the check part, which always runs.
 */
export function inert(file: string): boolean {
  if (file.startsWith('.plans/') || file.startsWith('docs/')) return true;
  return /\.mdx?$/.test(file) && !file.startsWith('packages/');
}

/** What only the consumer fixture exercises: the blank app and the fixture's own files. */
const consumerOnly = (file: string) => file.startsWith('template/') || file.startsWith('fixtures/');

/** What the consumer fixture depends on: the packages it packs, the blank app, its files, and what decides how anything installs or runs. */
const consumerInputs = (file: string) =>
  file.startsWith('packages/') || consumerOnly(file) || file.startsWith('.github/workflows/')
  || ['package.json', 'package-lock.json', '.node-version'].includes(file);

/** Whether `part` must run for these changed files. Unknown paths count for every and google; consumers runs only for its inputs. */
export function affects(part: Part, files: readonly string[]): boolean {
  const live = files.filter(file => !inert(file));
  if (part === 'consumers') return live.some(consumerInputs);
  return live.some(file => !consumerOnly(file));
}

/**
 * The files this branch changes, or undefined when they cannot be known (then everything runs). On a
 * GitHub pull request the checkout is the merge commit, whose first parent is the base branch's tip (the
 * workflow checks out two commits deep for it). REMY_CHANGES_BASE=<ref> (which ci sets to origin/main on
 * a local branch) compares against that ref instead.
 */
export function changedFiles(): string[] | undefined {
  const base = process.env.REMY_CHANGES_BASE;
  const pullRequest = process.env.GITHUB_EVENT_NAME === 'pull_request';
  if (!base && !pullRequest) return undefined;
  // Locally the work is often not committed yet: compare the files as they are (the working tree, and new
  // files) with where the branch left the base. On 2026-10-17 `${base}...HEAD`, commits only, told a branch
  // whose every change was uncommitted that nothing changed, and level 1 was skipped.
  const since = base ? spawnSync('git', ['merge-base', base, 'HEAD'], { encoding: 'utf8' }).stdout?.trim() : undefined;
  if (base && !since) { console.log(`could not tell what changed (no common commit with ${base}): running everything.`); return undefined; }
  const range = since ? [since] : ['HEAD^1', 'HEAD'];
  const result = spawnSync('git', ['diff', '--name-only', ...range], { encoding: 'utf8' });
  if (result.status !== 0) { console.log(`could not tell what changed (git diff ${range.join(' ')}): running everything.`); return undefined; }
  const added = since ? spawnSync('git', ['ls-files', '--others', '--exclude-standard'], { encoding: 'utf8' }).stdout ?? '' : '';
  return [...new Set(`${result.stdout}\n${added}`.split('\n').map(line => line.trim()).filter(Boolean))];
}

/**
 * What can make a page differ by language, so a change to it runs level 1 in every language: the catalogs
 * and language settings, fonts and any CSS (a layout that fits in English can overflow in German or Thai),
 * code that formats by locale (named for it, or using Intl, toLocale* or a text direction), the browser
 * checks themselves, and what decides the runtime (the lockfile, the Node version, whose Intl data it is).
 * Not the tooling (packages/ui/src/cli, tasks) or the unit checks: they render no page.
 * `read` gives a file's current text, undefined when it is gone (then its name alone decides).
 */
export function languageInput(file: string, read: (file: string) => string | undefined = path => existsSync(path) ? readFileSync(path, 'utf8') : undefined): boolean {
  // The lockfile, not package.json: a version bump or a script is no new dependency (2026-10-17: counting
  // package.json sent 44 of the last 80 commits on main to every language).
  if (file === 'package-lock.json' || file === '.node-version') return true;
  if (/\.unit\.spec\.[jt]s$/.test(file)) return false;
  if (/(^|\/)(checks\.js|smoke\.js|playwright\.js)$|\.checks\.js$|^tests\//.test(file)) return true;
  // The tooling (the command line, task scripts) prints dates and runs translators, but renders no page.
  if (/^packages\/ui\/src\/cli\/|^tasks\/|\.sh$/.test(file)) return false;
  if (/(^|\/)(messages|project\.inlang)\/|paraglide|locale|language|direction|i18n|intl|fonts?\b/i.test(file)) return true;
  if (/\.css$/.test(file)) return true;
  if (!/\.(tsx?|jsx?|mjs)$/.test(file)) return false;
  const text = read(file);
  return text === undefined || /\bIntl\.|\.toLocale[A-Z]\w*\(|getTextInfo|\bdir=|direction/.test(text);
}

/**
 * Whether level 1 must run in every language, or English and the first right-to-left language are enough.
 * Every language when what changed cannot be known (a push to main, a tag, --all: the full answer after
 * merge, which dev:promote waits for) or when a change can differ by language (languageInput); otherwise
 * the two, and it says so, naming the rule. Most of level 1's time is the same checks in thirteen
 * languages (2026-10-17: 174 of 247 checks, 71% of the time).
 */
export function allLanguages(): boolean {
  const files = changedFiles();
  if (!files) return true;
  const why = files.filter(file => !inert(file)).filter(file => languageInput(file));
  if (why.length) { console.log(`test every: every language: what changed can differ by language (${why.slice(0, 5).join(', ')}${why.length > 5 ? `, and ${why.length - 5} more` : ''}).`); return true; }
  console.log('test every: the quick languages only (the base language and the first right-to-left one: English and Arabic here): nothing that changed can differ by language. Every language runs after merge; --all runs them here.');
  return false;
}

/** True when `part` can be skipped: it says so, naming what changed, so a skipped job is never silent. */
export function skip(part: Part): boolean {
  const files = changedFiles();
  if (!files || affects(part, files)) return false;
  const shown = files.slice(0, 8).join(', ') + (files.length > 8 ? `, and ${files.length - 8} more` : '');
  console.log(`test ${part}: skipped, nothing it checks changed (${files.length ? shown : 'no files'}).`);
  return true;
}
