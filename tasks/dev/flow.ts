// The development flow, as code (owner, 2026-10-09: "The tooling formalises what happens at
// development ... make sure the developer flow is also formalised so that this stupid fuckups can't
// happen. And so you and developers use that same flow so that it's fixed forever"). This module is
// the one place the flow's decisions live: which checks run at which step, what runs locally and what
// runs on GitHub, what a step needs before it may run. The dev:* tasks are its commands; the
// agent hook (tasks/dev/guard.ts) refuses what is not one of them. TypeScript, type-checked by
// project:check, so a wrong step fails before it runs.
import { execFileSync, spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

/** The steps of development, in the order they happen (dev:start and dev:done bracket them for a worktree). */
export type Step = 'change' | 'land' | 'promote' | 'release';

/**
 * What each step runs, locally and on purpose, and nothing more. Every heavy task still exists for
 * running by hand or on GitHub; a step here is the only place it runs by default.
 */
export const steps: Record<Step, { what: string; tasks: readonly string[] }> = {
  // After every change, while coding: seconds. The plans list, types (the tasks' own included), the
  // plain-function checks, translation status; a build or the docs only when their inputs changed.
  change: { what: 'the check, in seconds', tasks: ['project:check'] },
  // The change leaves the machine: the check again, then commit, main, staging. GitHub runs every
  // language, Google's audits and the consumer fixture after the push, in parallel, while coding goes on.
  land: { what: 'the check, then commit, main and staging', tasks: ['project:check'] },
  // Production, on purpose: what is on a pushed main, no gate (staging and GitHub ran the checks).
  promote: { what: 'production from a pushed main', tasks: ['cf:deploy'] },
  // A release, on purpose, rarely: all of it, locally, then the tag (packages:release does both).
  release: { what: 'every check, every language, then the tag', tasks: ['packages:release'] },
};

/**
 * The tasks no step runs by default, and why: GitHub runs them after every push (project:test,
 * project:test:google, project:test:consumers, template:test), the release runs them
 * (project:verify), or they cost minutes for an answer the check already gave (project:test:quick,
 * project:test:remote, a bare playwright run). The hook refuses each outside its step and names the
 * step instead. Running one by hand stays possible: mise run <task> from a terminal is a decision.
 */
export const heavy: Record<string, string> = {
  'project:verify': 'the release gate: dev:release runs it; GitHub runs its parts after every push',
  'project:test': 'every language: GitHub runs it after every push (mise run dev:land)',
  'project:test:quick': 'every browser check: on purpose only; dev:change is the check',
  'project:test:remote': 'the suite against a deployment: GitHub runs the suite; cf:deploy runs the live smoke',
  'project:test:google': "Google's audits: GitHub runs them after every push",
  'project:test:cwv': 'Core Web Vitals on a preview: on purpose only, before a release',
  'project:test:consumers': 'the consumer fixture: GitHub runs it after every push',
  'template:test': 'the consumer fixture: GitHub runs it after every push',
  'playwright test': 'the browser suite by hand: dev:change runs the check; mise run project:test:only -- <words> runs one area',
  'i18n:translate': 'translation: dev:land runs it on main, once, after the merge',
};

const git = (...args: string[]) => execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).trim();

/** A GitHub run of the checks workflow, as `gh run list` reports it. */
export type Run = { status: string; conclusion: string | null; url: string; headSha: string };

/**
 * GitHub's run for `commit` (or the newest on main): what the heavy checks said. `undefined` when
 * gh cannot answer (not installed, not signed in, offline), `null` when GitHub has no run for it.
 */
export function latestRun(commit?: string): Run | null | undefined {
  const select = commit ? ['--commit', commit] : ['--branch', 'main'];
  const result = spawnSync('gh', ['run', 'list', ...select, '--limit', '1', '--json', 'status,conclusion,url,headSha'], { encoding: 'utf8', timeout: 15_000 });
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

/**
 * Runs a mise task in the foreground as part of `step`; the step stops at the first failure.
 * REMY_FLOW is what dev:allowed (the gate in every heavy task) looks for: a heavy task runs when a
 * step called it, on GitHub, or by a hand that set REMY_FLOW=hand, and refuses otherwise.
 */
export function run(task: string, step: Step | 'hand', args: string[] = []): void {
  const result = spawnSync('mise', ['run', task, ...(args.length ? ['--', ...args] : [])], { stdio: 'inherit', env: { ...process.env, REMY_FLOW: step } });
  if (result.status !== 0) { console.error(`dev:${step}: ${task} failed`); process.exit(result.status ?? 1); }
}

/** Where the work is: the branch, whether it is main, whether the tree is clean. */
export function where(): { branch: string; onMain: boolean; clean: boolean } {
  const branch = git('branch', '--show-current');
  return { branch, onMain: branch === 'main', clean: git('status', '--porcelain') === '' };
}

/** What a task is, as the hook sees a shell command: the task name a `mise run` names, or a bare tool. */
export function heavyIn(command: string): { task: string; why: string } | undefined {
  for (const [task, why] of Object.entries(heavy)) {
    const asMise = new RegExp(`\\bmise\\s+run\\s+${task.replace(/[:.]/g, '\\$&')}(\\s|$)`);
    const asTool = task.includes(' ') ? new RegExp(`\\b${task.replace(/\s+/g, '\\s+')}\\b`) : undefined;
    if (asMise.test(command) || asTool?.test(command)) return { task, why };
  }
  return undefined;
}
