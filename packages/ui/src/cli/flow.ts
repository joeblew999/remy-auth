// The development flow, as code (owner, 2026-10-09: "The tooling formalises what happens at
// development ... make sure the developer flow is also formalised so that this stupid fuckups can't
// happen. And so you and developers use that same flow so that it's fixed forever"). This module is
// the one place the flow's decisions live: which checks run at which step, what runs locally and what
// runs on GitHub, what a step needs before it may run. The scripts in package.json (npm run
// dev:<step>, remy <step>) are its commands; the agent hook (guard-hook.ts) refuses what is not one
// of them. TypeScript, type-checked by project:check, so a wrong step fails before it runs.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dispatch, type Subcommands } from './commands.ts';

/** The steps of development, in the order they happen (dev:start and dev:done bracket them for a worktree). */
export type Step = 'change' | 'land' | 'promote' | 'release';

/**
 * What each step runs, locally and on purpose, and nothing more. Every heavy task still exists for
 * running by hand or on GitHub; a step here is the only place it runs by default.
 */
export const steps: Record<Step, { what: string }> = {
  // After every change, while coding: seconds. check.ts, every part a function: the plans list, single
  // copies, a build when a route file changed, types (the tasks' own included), the plain-function
  // checks, translation status, the docs when docs changed.
  change: { what: 'the check, in seconds' },
  // The change leaves the machine: the check again, then commit, main, staging. GitHub runs every
  // language, Google's audits and the consumer fixture after the push, in parallel, while coding goes on.
  land: { what: 'the check and level 1 here, then a pull request, merged when GitHub agrees, and staging' },
  // Production, on purpose: what is on a pushed main, no gate (staging and GitHub ran the checks).
  promote: { what: 'production from a pushed main' },
  // A release, on purpose, rarely: all of it, locally, then the tag (packages.ts's release does both).
  release: { what: 'every check, every language, then the tag' },
};

/**
 * The flow as one command, `remy flow <step>` (npm run dev:<step>): status first, then the steps, then the
 * worktree's end. Each step is its own module, loaded when it runs; its line here is the one `remy help`
 * and `remy flow` print. A bare `remy <step>` still answers (remy.ts): the scripts of apps on 0.15 say it.
 */
type Script = { main: (args: string[]) => void | Promise<void> };
const step = (load: () => Promise<Script>) => (args: string[]) => load().then(module => module.main(args));
export const what = 'the development flow: the four steps, and the two that bracket a worktree (npm run dev:<step>)';
export const commands: Subcommands = {
  status: { what: "what is going on: main with GitHub's verdicts, the deployments, the worktrees, the translations", run: step(() => import('./status.ts')) },
  start: { what: '<name>: a worktree of your own from main, installed, its own ports, the guard', run: step(() => import('./start.ts')) },
  change: { what: steps.change.what, run: step(() => import('./change.ts')) },
  land: { what: `"<what changed>": ${steps.land.what}`, run: step(() => import('./land.ts')) },
  promote: { what: steps.promote.what, run: step(() => import('./promote.ts')) },
  release: { what: steps.release.what, run: step(() => import('./release.ts')) },
  done: { what: 'the worktree removed once its work is on main', run: step(() => import('./done.ts')) },
};
export const main = dispatch('flow', commands);

/**
 * The heavy commands no step runs by default, and why: GitHub runs them after every push (the suite,
 * Google's audits, the consumers), the release runs them (the gate), or they cost minutes for an
 * answer the check already gave (quick, remote, a bare playwright run). The gate (allowed.ts) knows
 * them by these names; the hook refuses each outside its step and names the step instead. Running one by hand stays possible: REMY_FLOW=hand in front, at a terminal, is a decision.
 */
export const heavy: Record<string, string> = {
  'project:verify': 'the release gate: dev:release runs it; GitHub runs its parts after every push',
  'project:test': 'level 1: npm run ci runs it, and dev:land and GitHub with it',
  'project:test:quick': 'every browser check: on purpose only; dev:change is the check',
  'project:test:remote': 'the suite against a deployment: GitHub runs the suite; cf:deploy runs the live smoke',
  'project:test:google': "Google's audits: GitHub runs them after every push",
  'project:test:cwv': 'Core Web Vitals on a preview: on purpose only, before a release',
  'project:test:consumers': 'the consumer fixture: GitHub runs it after every push',
  'template:test': 'the consumer fixture: GitHub runs it after every push',
  'playwright test': 'the browser suite by hand: dev:change runs the check; npm run test -- only <words> runs one area',
  'i18n:translate': 'translation: dev:land runs it in the change, before its commit',
  'i18n translate': 'translation: dev:land runs it in the change, before its commit',
  'remy test': 'level 1: npm run ci runs it, and dev:land and GitHub with it; one area: npm run test -- only <words>',
  'npm test': 'level 1: npm run ci runs it, and dev:land and GitHub with it; one area: npm run test -- only <words>',
  'test:consumers': 'the consumer fixture: GitHub runs it after every push; remy test consumers is its gate',
  // Serving by hand with a raw tool call (an agent did, 2026-10-17): every way to serve has its command.
  'wrangler dev': 'serving by hand: npx remy docs serve (the built docs, with llms.txt), npm run preview (the built app), npm run dev (hot reload); when no command does what you need, add one',
};

/** Where a key's spelling needs more than its words: the suite is refused, its light forms (only, report, live, smoke) are not. */
const spelled: Record<string, RegExp> = {
  'remy test': /\bremy(?:\.[jt]s)?\s+test(?!\s+(?:only|report|live|smoke)\b)/,
  'npm test': /\bnpm\s+(?:run\s+)?test\b(?!:)(?!\s+--\s+(?:only|report|live|smoke)\b)/,
  'test:consumers': /\bnpm\s+run\s+test:consumers\b|(?:^|[;&|(]\s*)(?:bash\s+|sh\s+|\.\/)fixtures\/consumer\/run\.sh\b/,
};

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A GitHub run of the checks workflow, as `gh run list` reports it. */
export type Run = { status: string; conclusion: string | null; url: string; headSha: string };

/**
 * GitHub's run for `commit` (or the newest on main): what the heavy checks said. `undefined` when
 * gh cannot answer (not installed, not signed in, offline), `null` when GitHub has no run for it.
 */
export function latestRun(commit?: string): Run | null | undefined {
  // Main's push runs only: Dependabot's run on a commit (event "dynamic") says nothing about the checks (on
  // 2026-10-11 it read as a green verdict on a commit whose checks had failed), and a release tag's run on
  // the same commit is the release job's, not the verdict (the same day it held a promote as "still checking").
  const select = commit ? ['--commit', commit, '--branch', 'main'] : ['--branch', 'main'];
  const result = spawnSync('gh', ['run', 'list', ...select, '--event', 'push', '--limit', '1', '--json', 'status,conclusion,url,headSha'], { encoding: 'utf8', timeout: 15_000 });
  if (result.status !== 0) return undefined;
  const [run] = JSON.parse(result.stdout || '[]') as Run[];
  return run ?? null;
}

/**
 * The install is what the lockfile says, or it is made so: npm writes what it installed to
 * node_modules/.package-lock.json, so a lockfile that moved (a version bump, a merge) shows there.
 * Nobody runs npm ci by hand; the steps that build (dev:start, dev:promote) call this first.
 */
export function installed(cwd = '.'): void {
  const same = (() => { try { return readFileSync(`${cwd}/package-lock.json`, 'utf8') === readFileSync(`${cwd}/node_modules/.package-lock.json`, 'utf8'); } catch { return false; } })();
  if (same) return;
  console.log(`${cwd === '.' ? '' : `${cwd}: `}node_modules is not what package-lock.json says; npm ci.`);
  const result = spawnSync('npm', ['ci', '--no-audit', '--no-fund', '--loglevel=error'], { cwd, stdio: 'inherit' });
  if (result.status !== 0) process.exit(result.status ?? 1);
}

/** One line a person reads: what GitHub said about a commit. */
export const describeRun = (run: Run) => `${run.status === 'completed' ? (run.conclusion ?? 'unknown') : 'still running'} on ${run.headSha.slice(0, 7)}: ${run.url}`;

/** Where the work is: the branch, whether it is main, whether the tree is clean. */
export function where(): { branch: string; onMain: boolean; clean: boolean } {
  const branch = git('branch', '--show-current');
  return { branch, onMain: branch === 'main', clean: git('status', '--porcelain') === '' };
}

/** What a command is, as the hook sees it: a spelled form (above), or a bare tool named with its words. */
export function heavyIn(command: string): { task: string; why: string } | undefined {
  for (const [task, why] of Object.entries(heavy)) {
    if (spelled[task]) { if (spelled[task].test(command)) return { task, why }; continue; }
    const asTool = task.includes(' ') ? new RegExp(`\\b${task.replace(/\s+/g, '\\s+')}\\b`) : undefined;
    if (asTool?.test(command)) return { task, why };
  }
  return undefined;
}
